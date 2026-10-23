import nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { SmtpEmailSender } from '../modules/auth/email/smtp-email-sender';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

describe('SmtpEmailSender', () => {
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'test-message' });
  const values: Record<string, string> = {
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: '465',
    SMTP_SECURE: 'true',
    SMTP_USER: 'sender@gmail.com',
    SMTP_PASSWORD: 'app-password',
    SMTP_FROM: '',
  };

  let sender: SmtpEmailSender;

  beforeEach(() => {
    jest.clearAllMocks();
    values.SMTP_HOST = 'smtp.gmail.com';
    values.SMTP_PORT = '465';
    values.SMTP_SECURE = 'true';
    values.SMTP_USER = 'sender@gmail.com';
    values.SMTP_PASSWORD = 'app-password';
    values.SMTP_FROM = '';
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
    sender = new SmtpEmailSender({
      get: (key: string) => values[key],
    } as ConfigService);
  });

  it('sends escaped verification email using Gmail SMTP settings', async () => {
    const expiresAt = new Date('2026-10-24T12:00:00.000Z');
    await sender.sendVerificationEmail(
      'member@example.com',
      '<Member>',
      'https://example.com/verify?token=secret&next=home',
      expiresAt,
    );

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: 'sender@gmail.com', pass: 'app-password' },
    });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: 'sender@gmail.com',
      to: 'member@example.com',
      subject: 'Verify your MSU Pakawit email',
      html: expect.stringContaining('&lt;Member&gt;'),
      text: expect.stringContaining('https://example.com/verify?token=secret&next=home'),
    }));
  });

  it('requires SMTP credentials when sending', async () => {
    values.SMTP_PASSWORD = '';

    await expect(sender.sendAlreadyRegisteredEmail('member@example.com'))
      .rejects.toThrow('SMTP_USER and SMTP_PASSWORD are required when EMAIL_PROVIDER=smtp');
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it('rejects an invalid SMTP port', async () => {
    values.SMTP_PORT = 'not-a-port';

    await expect(sender.sendAlreadyRegisteredEmail('member@example.com'))
      .rejects.toThrow('SMTP_PORT must be an integer between 1 and 65535');
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });
});
