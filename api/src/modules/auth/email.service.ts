import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  constructor(private readonly config: ConfigService) {}

  assertConfigured(): void {
    this.smtpSettings();
  }

  async sendVerificationEmail(to: string, verificationUrl: string): Promise<void> {
    const { host, port, from, user, pass, secure } = this.smtpSettings();

    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user && pass ? { auth: { user, pass } } : {}),
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });

    try {
      await transport.sendMail({
        from,
        to,
        subject: 'Verify your MSU Pakawit account',
        text: `Verify your email address using this link. It expires in ${Math.ceil(
          Number(this.config.get<string>('EMAIL_VERIFICATION_TOKEN_TTL_SECONDS') ?? 86400) / 3600,
        )} hours:\n\n${verificationUrl}\n\nIf you did not create this account, you can ignore this email.`,
      });
    } catch (error) {
      throw new ServiceUnavailableException('Unable to send the verification email. Please try again later.', {
        cause: error,
      });
    } finally {
      transport.close();
    }
  }

  private smtpSettings() {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT'));
    const from = this.config.get<string>('SMTP_FROM');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');
    const secure = this.config.get<string>('SMTP_SECURE') === 'true';

    if (!host || !Number.isInteger(port) || port <= 0 || !from || Boolean(user) !== Boolean(pass)) {
      throw new ServiceUnavailableException('Email delivery is not configured');
    }

    return { host, port, from, user, pass, secure };
  }
}
