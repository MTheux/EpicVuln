import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

class EmailService {
  private static instance: EmailService;
  private transporter: Transporter | null = null;
  private isDevMode: boolean;

  private constructor() {
    this.isDevMode =
      !env.SMTP_HOST ||
      env.SMTP_HOST === 'smtp.example.com';

    if (!this.isDevMode) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
  ): Promise<void> {
    const recipients = Array.isArray(to) ? to.join(', ') : to;

    if (this.isDevMode) {
      console.log('='.repeat(60));
      console.log('[EMAIL-DEV] Email not sent (dev mode)');
      console.log(`  From: ${env.SMTP_FROM}`);
      console.log(`  To: ${recipients}`);
      console.log(`  Subject: ${subject}`);
      console.log(`  HTML length: ${html.length} chars`);
      console.log('='.repeat(60));
      return;
    }

    try {
      const info = await this.transporter!.sendMail({
        from: env.SMTP_FROM,
        to: recipients,
        subject,
        html,
      });
      console.log(`[EMAIL] Message sent: ${info.messageId} -> ${recipients}`);
    } catch (error) {
      console.error('[EMAIL] Failed to send email:', error);
      throw error;
    }
  }

  async verifyConnection(): Promise<boolean> {
    if (this.isDevMode) {
      console.log('[EMAIL] Dev mode active — SMTP verification skipped');
      return true;
    }

    try {
      await this.transporter!.verify();
      console.log('[EMAIL] SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('[EMAIL] SMTP connection verification failed:', error);
      return false;
    }
  }
}

export const emailService = EmailService.getInstance();
