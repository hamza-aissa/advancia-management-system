import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { EmailNotification } from '../types';

export type EmailDeliveryResult = { status: 'sent' | 'simulated'; messageId?: string };

const escapeHtml = (value: string): string => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character]!));

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

  isConfigured(): boolean {
    return Boolean(config.email.auth.user && config.email.auth.pass);
  }

  async sendEmail(notification: EmailNotification): Promise<EmailDeliveryResult> {
    try {
      if (!this.isConfigured()) {
        console.log('⚠️  SMTP non configuré : notification simulée (aucun e-mail envoyé)');
        console.log('Destinataire(s) :', notification.to.join(', '));
        console.log('Objet :', notification.subject);
        return { status: 'simulated' };
      }

      const info = await this.transporter.sendMail({
        from: config.email.from,
        to: notification.to,
        subject: notification.subject,
        text: notification.text,
        html: notification.html
      });

      console.log(`✅ E-mail envoyé à : ${notification.to.join(', ')}`);
      return { status: 'sent', messageId: info.messageId };
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
  ): Promise<EmailDeliveryResult> {
    const typeLabel = type === 'license' ? 'Licence' : 'Contrat';
    const safeType = escapeHtml(typeLabel);
    const safeItem = escapeHtml(itemName);
    const safeClient = escapeHtml(clientName);
    const formattedDate = expiryDate.toLocaleDateString('fr-TN', { timeZone: config.cronTimezone });
    const delayLabel = daysUntilExpiry >= 0
      ? `${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''} restant${daysUntilExpiry > 1 ? 's' : ''}`
      : `expiré depuis ${Math.abs(daysUntilExpiry)} jour${Math.abs(daysUntilExpiry) > 1 ? 's' : ''}`;
    
    const subject = `Rappel d'échéance — ${typeLabel} ${itemName} — ${delayLabel}`;
    
    const text = `
Rappel d'échéance — ${typeLabel}

${typeLabel}: ${itemName}
Client : ${clientName}
Date d'échéance : ${formattedDate}
Délai : ${delayLabel}

Veuillez contacter le client et enregistrer la prochaine action dans Advancia.

---
Advancia — notification automatique interne
    `.trim();

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #d32f2f; margin-top: 0;">Rappel d'échéance — ${safeType}</h2>
          
          <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <strong>${escapeHtml(delayLabel)}</strong>
          </div>
          
          <table style="width: 100%; margin: 20px 0;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>${safeType} :</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${safeItem}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Client :</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${safeClient}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Date d'échéance :</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${formattedDate}</td>
            </tr>
          </table>
          
          <p style="margin: 20px 0;">Veuillez contacter le client et enregistrer la prochaine action dans Advancia.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; margin: 0;">
            <em>Advancia — notification automatique interne</em>
          </p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: recipients,
      subject,
      text,
      html
    });
  }
}

export const emailService = new EmailService();
