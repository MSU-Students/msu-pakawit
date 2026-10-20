import {
  BadRequestException,
  GoneException,
  TooManyRequestsException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { createHash } from 'crypto';
import * as argon2 from 'argon2';
import { AuthService } from '../modules/auth/auth.service';
import { PendingRegistration } from '../modules/auth/entities/pending-registration.entity';
import { EmailSender } from '../modules/auth/email/email-sender';
import { RegistrationRateLimiter } from '../modules/auth/registration-rate-limiter';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { UserService } from '../modules/users/user.service';

interface MemoryPending extends PendingRegistration {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  tokenHash: string;
  expiresAt: Date;
  lastSentAt: Date;
  resendCount: number;
}

interface MemoryUser extends User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  fullName: string;
  emailVerified: boolean;
}

const registerDto = {
  email: 'amina@msumain.edu.ph',
  fullName: 'Amina Radiamoda',
  password: 'correct horse battery staple',
  role: UserRole.STUDENT,
};

function verificationToken(sender: jest.Mock): string {
  const verificationUrl = sender.mock.calls[sender.mock.calls.length - 1][2] as string;
  return new URL(verificationUrl).searchParams.get('token') as string;
}

function createHarness(configValues: Record<string, string> = {}) {
  const pendingRows = new Map<string, MemoryPending>();
  const users: MemoryUser[] = [];
  let pendingId = 0;
  let userId = 0;

  const pendingRepository = {
    create: jest.fn((value: Partial<MemoryPending>) => ({
      ...value,
      id: value.id ?? `pending-${++pendingId}`,
    })),
    save: jest.fn(async (value: MemoryPending) => {
      pendingRows.set(value.id, value);
      return value;
    }),
    findOneBy: jest.fn(async ({ email }: { email: string }) =>
      [...pendingRows.values()].find((value) => value.email === email) ?? null,
    ),
    findOne: jest.fn(async ({ where }: { where: { email: string } }) =>
      [...pendingRows.values()].find((value) => value.email === where.email) ?? null,
    ),
    delete: jest.fn(async (id: string) => {
      const value = pendingRows.get(id);
      if (value) pendingRows.delete(id);
      return { affected: value ? 1 : 0 };
    }),
    createQueryBuilder: jest.fn(() => {
      let tokenHash = '';
      const builder = {
        addSelect: jest.fn(() => builder),
        where: jest.fn((_condition: string, parameters: { tokenHash: string }) => {
          tokenHash = parameters.tokenHash;
          return builder;
        }),
        setLock: jest.fn(() => builder),
        getOne: jest.fn(async () =>
          [...pendingRows.values()].find((value) => value.tokenHash === tokenHash) ?? null,
        ),
      };
      return builder;
    }),
  };

  const userRepository = {
    create: jest.fn((value: Partial<MemoryUser>) => ({
      ...value,
      id: `user-${++userId}`,
    })),
    save: jest.fn(async (value: MemoryUser) => {
      users.push(value);
      return value;
    }),
    createQueryBuilder: jest.fn(() => {
      let email = '';
      const builder = {
        where: jest.fn((_condition: string, parameters: { email: string }) => {
          email = parameters.email;
          return builder;
        }),
        getOne: jest.fn(async () => users.find((value) => value.email === email) ?? null),
      };
      return builder;
    }),
  };

  const manager = {
    query: jest.fn(),
    getRepository: jest.fn((entity: typeof User | typeof PendingRegistration) =>
      entity === User ? userRepository : pendingRepository,
    ),
  };
  let transactionQueue: Promise<unknown> = Promise.resolve();
  const dataSource = {
    transaction: jest.fn(async (callback: (manager: typeof manager) => Promise<unknown>) => {
      const previous = transactionQueue;
      let release: () => void = () => undefined;
      transactionQueue = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await callback(manager);
      } finally {
        release();
      }
    }),
  };

  const userService = {
    findByEmailForAuth: jest.fn(async (email: string) =>
      users.find((value) => value.email === email) ?? null,
    ),
  };
  const emailSender = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendAlreadyRegisteredEmail: jest.fn().mockResolvedValue(undefined),
  };
  const config = {
    get: jest.fn((key: string) => ({
      VERIFICATION_TOKEN_TTL_HOURS: '24',
      PASSWORD_MIN_LENGTH: '8',
      APP_BASE_URL: 'http://localhost:3000',
      ...configValues,
    })[key]),
  };
  const rateLimiter = new RegistrationRateLimiter();

  const service = new AuthService(
    userService as unknown as UserService,
    {} as unknown as JwtService,
    config as unknown as ConfigService,
    dataSource as unknown as DataSource,
    emailSender as EmailSender,
    rateLimiter,
  );

  return { service, pendingRows, users, userService, emailSender };
}

describe('Email registration and verification', () => {
  it('stores a pending registration without creating a user or storing the raw token', async () => {
    const { service, pendingRows, users, emailSender } = createHarness();
    const response = await service.register(registerDto, '192.0.2.1');
    const token = verificationToken(emailSender.sendVerificationEmail);
    const [pending] = [...pendingRows.values()];

    expect(response).toEqual({
      message: 'If the address can receive registration mail, instructions will be sent shortly.',
    });
    expect(users).toHaveLength(0);
    expect(pendingRows.size).toBe(1);
    expect(Buffer.from(token, 'base64url').byteLength).toBeGreaterThanOrEqual(32);
    expect(pending.tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(pending.tokenHash).not.toBe(token);
    expect(await argon2.verify(pending.passwordHash, registerDto.password)).toBe(true);
    expect(JSON.stringify(pending)).not.toContain(token);
    expect(JSON.stringify(response)).not.toContain(token);
  });

  it('creates one verified user and removes pending registration on valid redemption', async () => {
    const { service, pendingRows, users, emailSender } = createHarness();
    await service.register(registerDto, '192.0.2.1');
    const token = verificationToken(emailSender.sendVerificationEmail);

    await expect(service.verifyEmail(token)).resolves.toEqual({
      message: 'Email verified successfully.',
    });

    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      email: registerDto.email,
      username: registerDto.email,
      fullName: registerDto.fullName,
      emailVerified: true,
      role: registerDto.role,
      msuIdNumber: null,
    });
    expect(await argon2.verify(users[0].passwordHash, registerDto.password)).toBe(true);
    expect(pendingRows.size).toBe(0);
  });

  it('rejects an expired link without creating an account', async () => {
    const { service, pendingRows, users, emailSender } = createHarness();
    await service.register(registerDto, '192.0.2.1');
    const token = verificationToken(emailSender.sendVerificationEmail);
    const pending = [...pendingRows.values()][0];
    pending.expiresAt = new Date(Date.now() - 1);

    await expect(service.verifyEmail(token)).rejects.toBeInstanceOf(GoneException);
    expect(users).toHaveLength(0);
    expect(pendingRows.size).toBe(1);
  });

  it('sets token expiry using the configured hours and defaults to 24 hours', async () => {
    const defaultHarness = createHarness();
    const beforeDefault = Date.now();
    await defaultHarness.service.register(registerDto, '192.0.2.1');
    const defaultExpiry = [...defaultHarness.pendingRows.values()][0].expiresAt.getTime();
    expect(defaultExpiry - beforeDefault).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
    expect(defaultExpiry - beforeDefault).toBeLessThan(24 * 60 * 60 * 1000 + 5000);

    const configuredHarness = createHarness({ VERIFICATION_TOKEN_TTL_HOURS: '2' });
    const beforeConfigured = Date.now();
    await configuredHarness.service.register(registerDto, '192.0.2.2');
    const configuredExpiry = [...configuredHarness.pendingRows.values()][0].expiresAt.getTime();
    expect(configuredExpiry - beforeConfigured).toBeGreaterThanOrEqual(2 * 60 * 60 * 1000);
    expect(configuredExpiry - beforeConfigured).toBeLessThan(2 * 60 * 60 * 1000 + 5000);
  });

  it('rejects a token after use and rejects tampered or random tokens', async () => {
    const { service, emailSender } = createHarness();
    await service.register(registerDto, '192.0.2.1');
    const token = verificationToken(emailSender.sendVerificationEmail);

    await service.verifyEmail(token);
    await expect(service.verifyEmail(token)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.verifyEmail(`${token.slice(0, -1)}x`)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.verifyEmail('x'.repeat(43))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('replaces the old token when a pending email registers again', async () => {
    const { service, pendingRows, users, emailSender } = createHarness();
    const firstResponse = await service.register(registerDto, '192.0.2.1');
    const oldToken = verificationToken(emailSender.sendVerificationEmail);
    const secondResponse = await service.register(registerDto, '192.0.2.1');
    const newToken = verificationToken(emailSender.sendVerificationEmail);

    expect(secondResponse).toEqual(firstResponse);
    expect(newToken).not.toBe(oldToken);
    expect([...pendingRows.values()][0].resendCount).toBe(1);
    await expect(service.verifyEmail(oldToken)).rejects.toBeInstanceOf(BadRequestException);
    await service.verifyEmail(newToken);
    expect(users).toHaveLength(1);
    expect(pendingRows.size).toBe(0);
  });

  it('issues a fresh token on resend and invalidates the previous link', async () => {
    const { service, users, emailSender, pendingRows } = createHarness();
    await service.register(registerDto, '192.0.2.1');
    const oldToken = verificationToken(emailSender.sendVerificationEmail);

    await service.resendVerification(registerDto.email, '192.0.2.2');
    const freshToken = verificationToken(emailSender.sendVerificationEmail);

    expect(freshToken).not.toBe(oldToken);
    await expect(service.verifyEmail(oldToken)).rejects.toBeInstanceOf(BadRequestException);
    await service.verifyEmail(freshToken);
    expect(users).toHaveLength(1);
    expect(pendingRows.size).toBe(0);
  });

  it('returns the same generic response for an already verified email without duplicating users', async () => {
    const { service, users, emailSender } = createHarness();
    const firstResponse = await service.register(registerDto, '192.0.2.1');
    await service.verifyEmail(verificationToken(emailSender.sendVerificationEmail));

    const duplicateResponse = await service.register(registerDto, '192.0.2.1');

    expect(duplicateResponse).toEqual(firstResponse);
    expect(users).toHaveLength(1);
    expect(emailSender.sendAlreadyRegisteredEmail).toHaveBeenCalledWith(registerDto.email);
  });

  it('returns a generic response for resend whether or not a pending email exists', async () => {
    const { service } = createHarness();
    const absentResponse = await service.resendVerification('absent@msumain.edu.ph', '192.0.2.1');
    await service.register(registerDto, '192.0.2.2');
    const pendingResponse = await service.resendVerification(registerDto.email, '192.0.2.3');

    expect(pendingResponse).toEqual(absentResponse);
  });

  it('rejects disallowed domains and passwords shorter than the configured minimum', async () => {
    const { service } = createHarness({ ALLOWED_EMAIL_DOMAINS: 'msumain.edu.ph' });
    await expect(service.register(
      { ...registerDto, email: 'person@example.com' },
      '192.0.2.1',
    )).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.register(
      { ...registerDto, password: 'short' },
      '192.0.2.1',
    )).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a verified account with the selected employee or courier role', async () => {
    for (const role of [UserRole.EMPLOYEE, UserRole.COURIER]) {
      const { service, users, emailSender } = createHarness();
      await service.register({ ...registerDto, role }, `192.0.2.${role === UserRole.EMPLOYEE ? 5 : 6}`);
      await service.verifyEmail(verificationToken(emailSender.sendVerificationEmail));
      expect(users[0].role).toBe(role);
    }
  });

  it('limits registration and resend requests by email and IP', async () => {
    const { service } = createHarness();
    for (let index = 0; index < 5; index += 1) {
      await service.register(
        { ...registerDto, email: `member${index}@msumain.edu.ph` },
        '192.0.2.1',
      );
    }
    await expect(service.resendVerification('other@msumain.edu.ph', '192.0.2.1'))
      .rejects.toBeInstanceOf(TooManyRequestsException);
  });

  it('enforces the email limit even when requests come from different IPs', async () => {
    const limiter = new RegistrationRateLimiter();
    for (let index = 0; index < 5; index += 1) {
      limiter.consume('member@msumain.edu.ph', `192.0.2.${index + 1}`);
    }
    expect(() => limiter.consume('member@msumain.edu.ph', '192.0.2.6'))
      .toThrow(TooManyRequestsException);
  });

  it('allows only one account when the same token is redeemed concurrently', async () => {
    const { service, users, emailSender, pendingRows } = createHarness();
    await service.register(registerDto, '192.0.2.1');
    const token = verificationToken(emailSender.sendVerificationEmail);

    const results = await Promise.allSettled([
      service.verifyEmail(token),
      service.verifyEmail(token),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(users).toHaveLength(1);
    expect(pendingRows.size).toBe(0);
  });
});
