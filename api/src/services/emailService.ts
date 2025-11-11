import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { EmailNotification } from '../types';

class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass
      }
    });
  }

  async sendEmail(notification: EmailNotification): Promise<void> {
    try {
      if (!config.email.auth.user || !config.email.auth.pass) {
        console.log('⚠️  Email service not configured, logging notification instead:');
        console.log('To:', notification.to.join(', '));
        console.log('Subject:', notification.subject);
        console.log('Message:', notification.text);
        return;
      }

      await this.transporter.sendMail({
        from: config.email.from,
        to: notification.to,
        subject: notification.subject,
        text: notification.text,
        html: notification.html
      });

      console.log(`✅ Email sent to: ${notification.to.join(', ')}`);
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw error;
    }
  }

  async sendExpiryNotification(
    type: 'license' | 'contract',
    itemName: string,
    clientName: string,
    expiryDate: Date,
    daysUntilExpiry: number,
    recipients: string[]
  ): Promise<void> {
    const typeLabel = type === 'license' ? 'License' : 'Contract';
    
    const subject = `⚠️ ${typeLabel} Expiry Alert: ${itemName} - ${daysUntilExpiry} days remaining`;
    
    const text = `
${typeLabel} Expiry Notification

${typeLabel}: ${itemName}
Client: ${clientName}
Expiry Date: ${expiryDate.toLocaleDateString()}
Days Until Expiry: ${daysUntilExpiry}

This is an automated reminder that the ${type} will expire soon.
Please take necessary action.

---
Advancia Management System
    `.trim();

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #d32f2f; margin-top: 0;">⚠️ ${typeLabel} Expiry Alert</h2>
          
          <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <strong>Days Until Expiry: ${daysUntilExpiry}</strong>
          </div>
          
          <table style="width: 100%; margin: 20px 0;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>${typeLabel}:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${itemName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Client:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${clientName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Expiry Date:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${expiryDate.toLocaleDateString()}</td>
            </tr>
          </table>
          
          <p style="margin: 20px 0;">This is an automated reminder that the ${type} will expire soon. Please take necessary action.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; margin: 0;">
            <em>Advancia Management System - Automated Notification</em>
          </p>
        </div>
      </div>
    `;

    await this.sendEmail({
      to: recipients,
      subject,
      text,
      html
    });
  }
}

export const emailService = new EmailService();
