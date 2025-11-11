import cron from 'node-cron';
import { License } from '../models/License';
import { Contract } from '../models/Contract';
import { User } from '../models/User';
import { Client } from '../models/Client';
import { emailService } from '../services/emailService';
import { config } from '../config';
import { UserRole } from '../types';

export class ExpiryCheckerJob {
  private static instance: ExpiryCheckerJob;

  private constructor() {}

  static getInstance(): ExpiryCheckerJob {
    if (!ExpiryCheckerJob.instance) {
      ExpiryCheckerJob.instance = new ExpiryCheckerJob();
    }
    return ExpiryCheckerJob.instance;
  }

  start(): void {
    console.log(`🕐 Expiry checker cron job scheduled: ${config.cronSchedule}`);
    
    cron.schedule(config.cronSchedule, async () => {
      console.log('🔍 Running expiry check...');
      await this.checkExpiries();
    });
  }

  async checkExpiries(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check licenses
      await this.checkLicenseExpiries(today);

      // Check contracts
      await this.checkContractExpiries(today);

      console.log('✅ Expiry check completed');
    } catch (error) {
      console.error('❌ Error during expiry check:', error);
    }
  }

  private async checkLicenseExpiries(today: Date): Promise<void> {
    const licenses = await License.find({ isActive: true })
      .populate('client')
      .populate('assignedBy');

    for (const license of licenses) {
      const expiryDate = new Date(license.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);

      const diffTime = expiryDate.getTime() - today.getTime();
      const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Check if we need to send notification
      for (const threshold of config.notificationThresholds) {
        if (daysUntilExpiry === threshold) {
          await this.sendLicenseExpiryNotification(
            license,
            daysUntilExpiry,
            threshold
          );
          break;
        }
      }
    }
  }

  private async checkContractExpiries(today: Date): Promise<void> {
    const contracts = await Contract.find({ isActive: true })
      .populate('client')
      .populate('managedBy');

    for (const contract of contracts) {
      const expiryDate = new Date(contract.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);

      const diffTime = expiryDate.getTime() - today.getTime();
      const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Check if we need to send notification
      for (const threshold of config.notificationThresholds) {
        if (daysUntilExpiry === threshold) {
          await this.sendContractExpiryNotification(
            contract,
            daysUntilExpiry,
            threshold
          );
          break;
        }
      }
    }
  }

  private async sendLicenseExpiryNotification(
    license: any,
    daysUntilExpiry: number,
    threshold: number
  ): Promise<void> {
    const recipients: string[] = [];
    const agent = license.assignedBy;
    const client = license.client;

    // Add agent email (responsible party)
    if (agent && agent.email) {
      recipients.push(agent.email);
    }

    // At 10 days and 6 days, add admin emails
    if (threshold <= 10) {
      const admins = await User.find({ role: UserRole.ADMIN });
      recipients.push(...admins.map(admin => admin.email));
    }

    // At 6 days, add executive emails
    if (threshold <= 6) {
      recipients.push(...config.executiveEmails);
    }

    if (recipients.length === 0) {
      console.warn('⚠️  No recipients found for license notification');
      return;
    }

    console.log(`📧 Sending license expiry notification for: ${license.name} (${daysUntilExpiry} days)`);
    console.log(`   Recipients: ${recipients.join(', ')}`);

    await emailService.sendExpiryNotification(
      'license',
      license.name,
      client.name,
      license.expiryDate,
      daysUntilExpiry,
      recipients
    );
  }

  private async sendContractExpiryNotification(
    contract: any,
    daysUntilExpiry: number,
    threshold: number
  ): Promise<void> {
    const recipients: string[] = [];
    const consultant = contract.managedBy;
    const client = contract.client;

    // Add consultant email (responsible party)
    if (consultant && consultant.email) {
      recipients.push(consultant.email);
    }

    // At 10 days and 6 days, add admin emails
    if (threshold <= 10) {
      const admins = await User.find({ role: UserRole.ADMIN });
      recipients.push(...admins.map(admin => admin.email));
    }

    // At 6 days, add executive emails
    if (threshold <= 6) {
      recipients.push(...config.executiveEmails);
    }

    if (recipients.length === 0) {
      console.warn('⚠️  No recipients found for contract notification');
      return;
    }

    console.log(`📧 Sending contract expiry notification for: ${contract.title} (${daysUntilExpiry} days)`);
    console.log(`   Recipients: ${recipients.join(', ')}`);

    await emailService.sendExpiryNotification(
      'contract',
      contract.title,
      client.name,
      contract.expiryDate,
      daysUntilExpiry,
      recipients
    );
  }
}

export const expiryCheckerJob = ExpiryCheckerJob.getInstance();
