import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { resolve } from 'path';
import { EmailSender } from './email-sender';

interface LocalEmail {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  deliveredAt: string;
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
export class LocalMailboxEmailSender implements EmailSender {
  private readonly logger = new Logger(LocalMailboxEmailSender.name);
  private readonly mailboxDirectory: string;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.mailboxDirectory = resolve(config.get<string>('LOCAL_MAILBOX_DIR') ?? '.local-mailbox');
    this.from = config.get<string>('EMAIL_FROM') ?? 'MSU Pakawit <no-reply@localhost>';
  }

  async sendVerificationEmail(
    email: string,
    fullName: string,
    verificationUrl: string,
    expiresAt: Date,
  ): Promise<void> {
    const expiry = expiresAt.toUTCString();
    const safeName = escapeHtml(fullName);
    const safeUrl = escapeHtml(verificationUrl);
    await this.deliver({
      to: email,
      from: this.from,
      subject: 'Verify your MSU Pakawit email',
      text: `Hello ${fullName},\n\nVerify your email using this link:\n${verificationUrl}\n\nThis link expires at ${expiry}.`,
      html: `<p>Hello ${safeName},</p><p><a href="${safeUrl}">Verify your email</a></p><p>This link expires at ${expiry}.</p>`,
      deliveredAt: new Date().toISOString(),
    });
  }

  async sendAlreadyRegisteredEmail(email: string): Promise<void> {
    await this.deliver({
      to: email,
      from: this.from,
      subject: 'Your MSU Pakawit account already exists',
      text: 'An MSU Pakawit account is already registered with this email address. If you did not create it, contact the platform support team.',
      html: '<p>An MSU Pakawit account is already registered with this email address.</p><p>If you did not create it, contact the platform support team.</p>',
      deliveredAt: new Date().toISOString(),
    });
  }

  private async deliver(email: LocalEmail): Promise<void> {
    await mkdir(this.mailboxDirectory, { recursive: true });
    await writeFile(resolve(this.mailboxDirectory, `${randomUUID()}.json`), JSON.stringify(email, null, 2), {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
    this.logger.log(`Local email delivered to ${email.to}: ${email.subject}`);
  }
}
