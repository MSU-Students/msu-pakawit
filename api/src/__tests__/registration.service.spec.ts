import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuthService } from '../modules/auth/auth.service';
import { RegistrationVerification } from '../modules/auth/entities/registration-verification.entity';
import { EmailService } from '../modules/auth/email.service';
import { UserRole } from '../modules/users/entities/user.entity';
import { UserService } from '../modules/users/user.service';

describe('AuthService registration', () => {
  let service: AuthService;
  let verificationRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let manager: { getRepository: jest.Mock };
  let userService: jest.Mocked<Partial<UserService>>;
  let emailService: jest.Mocked<Partial<EmailService>>;
  let storedVerification: RegistrationVerification;

  beforeEach(() => {
    storedVerification = {
      id: 'pending-1',
      msuIdNumber: '2026-01429',
      username: 'amina.radiamoda',
      fullName: 'Amina Radiamoda',
      email: 'amina@msumain.edu.ph',
      role: UserRole.COURIER,
      passwordHash: '',
      tokenHash: '',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    };
    verificationRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => data as RegistrationVerification),
      save: jest.fn(async (data) => Object.assign(data, { id: 'pending-1' }) as RegistrationVerification),
      delete: jest.fn(),
    };
    const transactionRepository = {
      findOne: jest.fn().mockResolvedValue(storedVerification),
      remove: jest.fn(),
    };
    manager = { getRepository: jest.fn().mockReturnValue(transactionRepository) };
    const dataSource = {
      transaction: jest.fn((callback: (entityManager: EntityManager) => Promise<unknown>) =>
        callback(manager as unknown as EntityManager)),
    };
    userService = {
      ensureRegistrationIdentifiersAvailable: jest.fn().mockResolvedValue(undefined),
      createVerifiedUser: jest.fn().mockResolvedValue({
        id: 'user-1',
        username: 'amina.radiamoda',
        fullName: 'Amina Radiamoda',
        role: UserRole.COURIER,
      }),
    };
    emailService = { sendRegistrationVerification: jest.fn().mockResolvedValue(undefined) };

    service = new AuthService(
      userService as unknown as UserService,
      {} as any,
      { get: jest.fn((key: string) => key === 'CLIENT_URL' ? 'https://pakawit.example' : '30') } as unknown as ConfigService,
      verificationRepo as unknown as Repository<RegistrationVerification>,
      dataSource as unknown as DataSource,
      emailService as unknown as EmailService,
    );
  });

  it('stores only a password hash and token hash, then emails the one-time verification link', async () => {
    await service.register({
      msuIdNumber: '2026-01429',
      username: 'Amina.Radiamoda',
      fullName: 'Amina Radiamoda',
      email: 'AMINA@MSUMAIN.EDU.PH',
      password: 'a-long-registration-password',
      role: UserRole.COURIER,
    });

    const saved = verificationRepo.save!.mock.calls[0][0] as RegistrationVerification;
    expect(saved.username).toBe('amina.radiamoda');
    expect(saved.email).toBe('amina@msumain.edu.ph');
    expect(saved.role).toBe(UserRole.COURIER);
    expect(await argon2.verify(saved.passwordHash, 'a-long-registration-password')).toBe(true);
    expect(saved.passwordHash).not.toBe('a-long-registration-password');
    expect(saved.tokenHash).toMatch(/^[a-f0-9]{64}$/);

    const [, , verificationUrl] = emailService.sendRegistrationVerification!.mock.calls[0];
    const rawToken = new URL(verificationUrl).searchParams.get('verifyEmail');
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(saved.tokenHash).not.toBe(rawToken);
  });

  it('does not leave a pending registration when email delivery fails', async () => {
    emailService.sendRegistrationVerification!.mockRejectedValueOnce(new Error('SMTP unavailable'));

    await expect(service.register({
      msuIdNumber: '2026-01429',
      username: 'amina.radiamoda',
      fullName: 'Amina Radiamoda',
      email: 'amina@msumain.edu.ph',
      password: 'a-long-registration-password',
      role: UserRole.STUDENT,
    })).rejects.toThrow('SMTP unavailable');

    expect(verificationRepo.delete).toHaveBeenCalledWith({ id: 'pending-1' });
  });

  it('creates the user and removes the pending registration only for a valid token', async () => {
    storedVerification.tokenHash = require('crypto').createHash('sha256').update('valid-token').digest('hex');
    const result = await service.verifyEmail('valid-token');

    expect(userService.createVerifiedUser).toHaveBeenCalledWith(manager, storedVerification);
    expect(manager.getRepository().remove).toHaveBeenCalledWith(storedVerification);
    expect(result.user).toEqual({
      id: 'user-1',
      username: 'amina.radiamoda',
      fullName: 'Amina Radiamoda',
      role: 'COURIER',
    });
  });

  it('rejects missing or expired verification tokens', async () => {
    manager.getRepository().findOne.mockResolvedValueOnce(null);
    await expect(service.verifyEmail('unknown-token')).rejects.toBeInstanceOf(BadRequestException);

    storedVerification.expiresAt = new Date(Date.now() - 1000);
    await expect(service.verifyEmail('expired-token')).rejects.toBeInstanceOf(BadRequestException);
    expect(userService.createVerifiedUser).not.toHaveBeenCalled();
  });

  it('rejects duplicate pending identifiers', async () => {
    verificationRepo.findOne!.mockResolvedValueOnce(storedVerification);
    await expect(service.register({
      msuIdNumber: '2026-01429',
      username: 'amina.radiamoda',
      fullName: 'Amina Radiamoda',
      email: 'amina@msumain.edu.ph',
      password: 'a-long-registration-password',
      role: UserRole.STUDENT,
    })).rejects.toBeInstanceOf(ConflictException);
    expect(emailService.sendRegistrationVerification).not.toHaveBeenCalled();
  });
});
