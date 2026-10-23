import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { EmailSender } from './email-sender';

interface SmtpConfiguration {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });

@Injectable()
export class SmtpEmailSender implements EmailSender {
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {}

  async sendVerificationEmail(
    email: string,
    fullName: string,
    verificationUrl: string,
    expiresAt: Date,
  ): Promise<void> {
    const expiry = expiresAt.toUTCString();
    const safeName = escapeHtml(fullName);
    const safeUrl = escapeHtml(verificationUrl);
    const smtp = this.getSmtpConfiguration();

    await this.getTransporter(smtp).sendMail({
      from: this.config.get<string>('SMTP_FROM') || smtp.user,
      to: email,
      subject: 'Verify your MSU Pakawit email',
      text: `Hello ${fullName},\n\nVerify your email using this link:\n${verificationUrl}\n\nThis link expires at ${expiry}.`,
      html: `<p>Hello ${safeName},</p><p><a href="${safeUrl}">Verify your email</a></p><p>This link expires at ${expiry}.</p>`,
    });
  }

  async sendAlreadyRegisteredEmail(email: string): Promise<void> {
    const smtp = this.getSmtpConfiguration();
    await this.getTransporter(smtp).sendMail({
      from: this.config.get<string>('SMTP_FROM') || smtp.user,
      to: email,
      subject: 'Your MSU Pakawit account already exists',
      text: 'An MSU Pakawit account is already registered with this email address. If you did not create it, contact the platform support team.',
      html: '<p>An MSU Pakawit account is already registered with this email address.</p><p>If you did not create it, contact the platform support team.</p>',
    });
  }

  private getTransporter(configuration: SmtpConfiguration): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: configuration.host,
        port: configuration.port,
        secure: configuration.secure,
        auth: {
          user: configuration.user,
          pass: configuration.password,
        },
      });
    }
    return this.transporter;
  }

  private getSmtpConfiguration(): SmtpConfiguration {
    const host = this.config.get<string>('SMTP_HOST')?.trim() || 'smtp.gmail.com';
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const password = this.config.get<string>('SMTP_PASSWORD');
    const portValue = this.config.get<string>('SMTP_PORT') ?? '465';
    const port = Number(portValue);
    const secureValue = this.config.get<string>('SMTP_SECURE');

    if (!user || !password) {
      throw new Error('SMTP_USER and SMTP_PASSWORD are required when EMAIL_PROVIDER=smtp');
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('SMTP_PORT must be an integer between 1 and 65535');
    }
    if (secureValue !== undefined && !['true', 'false'].includes(secureValue.toLowerCase())) {
      throw new Error('SMTP_SECURE must be true or false');
    }

    return {
      host,
      port,
      secure: secureValue === undefined ? port === 465 : secureValue.toLowerCase() === 'true',
      user,
      password,
    };
  }
}
