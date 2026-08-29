import cron from 'node-cron';
import { License } from '../models/License';
import { Contract } from '../models/Contract';
import { User } from '../models/User';
import { NotificationLog } from '../models/NotificationLog';
import { emailService } from '../services/emailService';
import { config } from '../config';
import { UserRole } from '../types';
import { daysUntil } from '../services/renewalDomain';

type Kind = 'license' | 'contract';

export class ExpiryCheckerJob {
  private static instance: ExpiryCheckerJob;
  private constructor() {}
  static getInstance(): ExpiryCheckerJob {
    if (!this.instance) this.instance = new ExpiryCheckerJob();
    return this.instance;
  }

  start(): void {
    console.log(`🕐 Expiry checker cron job scheduled: ${config.cronSchedule}`);
    cron.schedule(config.cronSchedule, () => this.checkExpiries());
  }

  async checkExpiries(): Promise<void> {
    try {
      const [licenses, contracts, admins] = await Promise.all([
        License.find({ isActive: true, archivedAt: null, renewalStatus: { $nin: ['renewed', 'declined'] } }).populate('client').populate('assignedBy'),
        Contract.find({ isActive: true, archivedAt: null, renewalStatus: { $nin: ['renewed', 'declined'] } }).populate('client').populate('managedBy'),
        User.find({ role: UserRole.ADMIN }).select('email')
      ]);
      const adminEmails = admins.map(user => user.email);
      for (const item of licenses) await this.process('license', item, item.assignedBy as any, adminEmails);
      for (const item of contracts) await this.process('contract', item, item.managedBy as any, adminEmails);
      console.log('✅ Expiry check completed');
    } catch (error) { console.error('❌ Error during expiry check:', error); }
  }

  private async process(kind: Kind, item: any, owner: any, adminEmails: string[]): Promise<void> {
    const threshold = daysUntil(item.expiryDate);
    if (![15, 10, 6].includes(threshold)) return;
    const recipients = [owner?.email];
    if (threshold <= 10) recipients.push(...adminEmails);
    if (threshold <= 6) recipients.push(...config.executiveEmails);
    const uniqueRecipients = [...new Set(recipients.filter(Boolean).map((email: string) => email.toLowerCase()))];
    const renewalCycle = new Date(item.expiryDate).toISOString().slice(0, 10);
    const clientName = item.client?.name || 'Unknown client';
    const itemName = kind === 'license' ? item.name : item.title;

    for (const recipient of uniqueRecipients) {
      const key = { itemKind: kind, itemId: item._id, renewalCycle, threshold, recipient };
      let log = await NotificationLog.findOne(key);
      if (log?.deliveryStatus === 'sent') continue;
      if (!log) log = await NotificationLog.create({ ...key, deliveryStatus: 'pending' });
      log.deliveryStatus = 'pending'; log.attemptedAt = new Date(); log.error = undefined; await log.save();
      try {
        await emailService.sendExpiryNotification(kind, itemName, clientName, item.expiryDate, threshold, [recipient]);
        log.deliveryStatus = 'sent'; log.sentAt = new Date(); await log.save();
      } catch (error) {
        log.deliveryStatus = 'failed'; log.error = error instanceof Error ? error.message : 'Unknown delivery error'; await log.save();
        console.error(`Failed ${kind} alert to ${recipient}:`, error);
      }
    }
  }
}

export const expiryCheckerJob = ExpiryCheckerJob.getInstance();
