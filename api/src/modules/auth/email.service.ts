import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

@Injectable()
export class EmailService {
  constructor(private readonly config: ConfigService) {}

  async sendDeliveryOtp(to: string, fullName: string, code: string, expiresAt: Date): Promise<void> {
    const { transporter, from } = this.createTransporter();

    try {
      await transporter.sendMail({
        from,
        to,
        subject: 'Your MSU Pakawit delivery verification code',
        text: `Hello ${fullName},\n\nYour delivery verification code is ${code}. Share it with your courier only when your order is handed to you at the drop zone. This code expires at ${expiresAt.toISOString()}.\n\nIf you did not expect this delivery, contact MSU Pakawit support.`,
      });
    } catch (error) {
      throw new ServiceUnavailableException('Unable to send the delivery verification email', { cause: error });
    }
  }

  async sendRegistrationVerification(to: string, fullName: string, verificationUrl: string): Promise<void> {
    const { transporter, from } = this.createTransporter();

    try {
      await transporter.sendMail({
        from,
        to,
        subject: 'Verify your MSU Pakawit account',
        text: `Hello ${fullName},\n\nVerify your email address by opening this link:\n${verificationUrl}\n\nThis link expires soon. If you did not request this, you can ignore this email.`,
      });
    } catch (error) {
      throw new ServiceUnavailableException('Unable to send the verification email', { cause: error });
    }
  }

  private createTransporter() {
    const host = this.config.get<string>('SMTP_HOST');
    const from = this.config.get<string>('SMTP_FROM');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const secureValue = this.config.get<string>('SMTP_SECURE');
    const secure = secureValue === undefined ? port === 465 : secureValue === 'true';
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');

    if (
      !host ||
      !from ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535 ||
      (secureValue !== undefined && secureValue !== 'true' && secureValue !== 'false') ||
      Boolean(user) !== Boolean(pass)
    ) {
      throw new ServiceUnavailableException('Email delivery is not configured');
    }

    try {
      const transporter = createTransport({
        host,
        port,
        secure,
        ...(user && pass ? { auth: { user, pass } } : {}),
      });
      return { transporter, from };
    } catch (error) {
      throw new ServiceUnavailableException('Unable to configure email delivery', { cause: error });
    }
  }
}
