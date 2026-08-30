import cron, { ScheduledTask } from 'node-cron';
import { License } from '../models/License';
import { Contract } from '../models/Contract';
import { User } from '../models/User';
import { NotificationLog } from '../models/NotificationLog';
import { emailService } from '../services/emailService';
import { config } from '../config';
import { UserRole } from '../types';
import { daysUntil } from '../services/renewalDomain';

type Kind = 'license' | 'contract';
type Trigger = 'scheduled' | 'manual';
type Threshold = 15 | 10 | 6;

export interface ExpiryRunReport {
  trigger: Trigger;
  startedAt: string;
  finishedAt: string;
  itemsChecked: number;
  sent: number;
  simulated: number;
  failed: number;
  skipped: number;
}

export interface ExpiryJobStatus {
  schedule: string;
  timezone: string;
  scheduled: boolean;
  running: boolean;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  nextRunAt: string | null;
  lastReport: ExpiryRunReport | null;
}

/** Selects the escalation already reached, so a late run catches up without sending three alerts at once. */
export const dueThreshold = (days: number): Threshold | null => {
  if (days > 15) return null;
  if (days > 10) return 15;
  if (days > 6) return 10;
  return 6;
};

export const validateCronConfiguration = (schedule: string, timezone: string): void => {
  if (!cron.validate(schedule)) throw new Error(`CRON_SCHEDULE invalide : ${schedule}`);
  try {
    new Intl.DateTimeFormat('fr-TN', { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error(`CRON_TIMEZONE invalide : ${timezone}`);
  }
};

export class ExpiryCheckerJob {
  private static instance: ExpiryCheckerJob;
  private task?: ScheduledTask;
  private running = false;
  private lastRunAt?: Date;
  private lastSuccessAt?: Date;
  private lastFailureAt?: Date;
  private lastError?: string;
  private lastReport?: ExpiryRunReport;

  private constructor() {}

  static getInstance(): ExpiryCheckerJob {
    if (!this.instance) this.instance = new ExpiryCheckerJob();
    return this.instance;
  }

  start(): void {
    if (this.task) return;
    validateCronConfiguration(config.cronSchedule, config.cronTimezone);
    this.task = cron.schedule(
      config.cronSchedule,
      async () => { await this.run('scheduled'); },
      { timezone: config.cronTimezone, noOverlap: true, name: 'rappels-echeances' }
    );
    console.log(`🕐 Rappels planifiés : ${config.cronSchedule} (${config.cronTimezone})`);
  }

  getStatus(): ExpiryJobStatus {
    return {
      schedule: config.cronSchedule,
      timezone: config.cronTimezone,
      scheduled: Boolean(this.task),
      running: this.running,
      lastRunAt: this.lastRunAt?.toISOString() ?? null,
      lastSuccessAt: this.lastSuccessAt?.toISOString() ?? null,
      lastFailureAt: this.lastFailureAt?.toISOString() ?? null,
      lastError: this.lastError ?? null,
      nextRunAt: this.task?.getNextRun()?.toISOString() ?? null,
      lastReport: this.lastReport ?? null
    };
  }

  async run(trigger: Trigger = 'manual'): Promise<ExpiryRunReport | null> {
    if (this.running) return null;
    this.running = true;
    this.lastRunAt = new Date();
    const report: ExpiryRunReport = {
      trigger,
      startedAt: this.lastRunAt.toISOString(),
      finishedAt: '',
      itemsChecked: 0,
      sent: 0,
      simulated: 0,
      failed: 0,
      skipped: 0
    };

    try {
      const [licenses, contracts, admins] = await Promise.all([
        License.find({ isActive: true, archivedAt: null, renewalStatus: { $nin: ['renewed', 'declined'] } }).populate('client').populate('assignedBy'),
        Contract.find({ isActive: true, archivedAt: null, renewalStatus: { $nin: ['renewed', 'declined'] } }).populate('client').populate('managedBy'),
        User.find({ role: UserRole.ADMIN }).select('email')
      ]);
      const adminEmails = admins.map((user) => user.email);
      report.itemsChecked = licenses.length + contracts.length;
      for (const item of licenses) await this.process('license', item, item.assignedBy as any, adminEmails, report);
      for (const item of contracts) await this.process('contract', item, item.managedBy as any, adminEmails, report);
      this.lastSuccessAt = new Date();
      this.lastError = undefined;
      console.log(`✅ Vérification terminée : ${report.sent} envoyé(s), ${report.simulated} simulé(s), ${report.failed} échec(s)`);
    } catch (error) {
      this.lastFailureAt = new Date();
      this.lastError = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Échec de la vérification des échéances :', error);
      throw error;
    } finally {
      report.finishedAt = new Date().toISOString();
      this.lastReport = report;
      this.running = false;
    }
    return report;
  }

  /** Kept for the existing CLI script. */
  async checkExpiries(): Promise<ExpiryRunReport | null> {
    return this.run('manual');
  }

  private async process(kind: Kind, item: any, owner: any, adminEmails: string[], report: ExpiryRunReport): Promise<void> {
    const days = daysUntil(item.expiryDate);
    const threshold = dueThreshold(days);
    if (!threshold) { report.skipped += 1; return; }
    const recipients = [owner?.email];
    if (threshold <= 10) recipients.push(...adminEmails);
    if (threshold <= 6) recipients.push(...config.executiveEmails);
    const uniqueRecipients = [...new Set(recipients.filter(Boolean).map((email: string) => email.toLowerCase()))];
    const renewalCycle = new Date(item.expiryDate).toISOString().slice(0, 10);
    const clientName = item.client?.name || 'Client inconnu';
    const itemName = kind === 'license' ? item.name : item.title;

    for (const recipient of uniqueRecipients) {
      const key = { itemKind: kind, itemId: item._id, renewalCycle, threshold, recipient };
      let log = await NotificationLog.findOne(key);
      if (log?.deliveryStatus === 'sent' || (log?.deliveryStatus === 'simulated' && !emailService.isConfigured())) {
        report.skipped += 1;
        continue;
      }
      if (!log) log = await NotificationLog.create({ ...key, deliveryStatus: 'pending' });
      log.deliveryStatus = 'pending';
      log.attemptedAt = new Date();
      log.error = undefined;
      await log.save();
      try {
        const result = await emailService.sendExpiryNotification(kind, itemName, clientName, item.expiryDate, days, [recipient]);
        log.deliveryStatus = result.status;
        if (result.status === 'sent') {
          log.sentAt = new Date();
          report.sent += 1;
        } else {
          report.simulated += 1;
        }
        await log.save();
      } catch (error) {
        log.deliveryStatus = 'failed';
        log.error = error instanceof Error ? error.message : 'Erreur de livraison inconnue';
        await log.save();
        report.failed += 1;
        console.error(`Échec du rappel ${kind} vers ${recipient} :`, error);
      }
    }
  }
}

export const expiryCheckerJob = ExpiryCheckerJob.getInstance();
