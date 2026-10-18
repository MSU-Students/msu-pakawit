export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export interface EmailSender {
  sendVerificationEmail(email: string, fullName: string, verificationUrl: string, expiresAt: Date): Promise<void>;
  sendAlreadyRegisteredEmail(email: string): Promise<void>;
}
