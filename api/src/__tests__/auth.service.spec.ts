import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from '../modules/auth/auth.service';
import { UserRole } from '../modules/users/entities/user.entity';
import { UserService } from '../modules/users/user.service';
import { EmailService } from '../modules/auth/email.service';
import { createHash } from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  let userService: {
    findByUsernameForAuth: jest.Mock;
    createPendingUser: jest.Mock;
    verifyEmailToken: jest.Mock;
    updateEmailVerificationToken: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };
  let emailService: { assertConfigured: jest.Mock; sendVerificationEmail: jest.Mock };
  let config: { get: jest.Mock };
  let user: any;

  beforeEach(async () => {
    user = {
      id: 'user-1',
      username: 'amina.radiamoda',
      passwordHash: await argon2.hash('correct horse battery staple'),
      fullName: 'Amina Radiamoda',
      email: 'amina@msumain.edu.ph',
      role: UserRole.STUDENT,
      isActive: true,
      emailVerified: true,
    };
    userService = {
      findByUsernameForAuth: jest.fn().mockResolvedValue(user),
      createPendingUser: jest.fn(),
      verifyEmailToken: jest.fn(),
      updateEmailVerificationToken: jest.fn().mockResolvedValue(true),
    };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed-access-token') };
    emailService = {
      assertConfigured: jest.fn(),
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    };
    config = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_TOKEN_TTL_SECONDS') return 3600;
        if (key === 'EMAIL_VERIFICATION_TOKEN_TTL_SECONDS') return 86400;
        if (key === 'CLIENT_URL') return 'http://localhost:5173';
        return undefined;
      }),
    };

    service = new AuthService(
      userService as unknown as UserService,
      jwtService as unknown as JwtService,
      config as unknown as ConfigService,
      emailService as unknown as EmailService,
    );
  });

  it('verifies the password, signs a token, and returns only the safe profile', async () => {
    const result = await service.login({ username: 'Amina.Radiamoda', password: 'correct horse battery staple' });

    expect(userService.findByUsernameForAuth).toHaveBeenCalledWith('Amina.Radiamoda');
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      username: 'amina.radiamoda',
      role: UserRole.STUDENT,
    });
    expect(result).toEqual({
      accessToken: 'signed-access-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: { id: 'user-1', username: 'amina.radiamoda', fullName: 'Amina Radiamoda', role: UserRole.STUDENT },
    });
    expect(JSON.stringify(result)).not.toContain(user.passwordHash);
    expect(JSON.stringify(result)).not.toContain('correct horse battery staple');
  });

  it('returns the same unauthorized error for unknown users, wrong passwords, and inactive accounts', async () => {
    const errors = [];
    for (const candidate of [null, user, { ...user, isActive: false }, { ...user, emailVerified: false }]) {
      userService.findByUsernameForAuth.mockResolvedValueOnce(candidate);
      try {
        await service.login({ username: 'amina.radiamoda', password: 'incorrect password' });
      } catch (error) {
        errors.push(error);
      }
    }

    expect(errors).toHaveLength(4);
    expect(errors.every((error) => error instanceof UnauthorizedException)).toBe(true);
    expect(errors.map((error: UnauthorizedException) => error.message)).toEqual([
      'Invalid username or password',
      'Invalid username or password',
      'Invalid username or password',
      'Invalid username or password',
    ]);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('creates a pending account and emails a one-time verification link', async () => {
    const dto = {
      msuIdNumber: '2026-01429',
      username: 'amina.radiamoda',
      fullName: 'Amina Radiamoda',
      email: 'amina@msumain.edu.ph',
      password: 'correct horse battery staple',
    };

    await service.register(dto);

    expect(userService.createPendingUser).toHaveBeenCalledTimes(1);
    const [registeredDto, tokenHash, expiresAt] = userService.createPendingUser.mock.calls[0];
    expect(registeredDto).toEqual(dto);
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const [recipient, link] = emailService.sendVerificationEmail.mock.calls[0];
    const token = new URL(link).searchParams.get('verify-email');
    expect(recipient).toBe(dto.email);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(createHash('sha256').update(token).digest('hex')).toBe(tokenHash);
  });

  it('hashes verification tokens before checking them', async () => {
    const token = 'a'.repeat(64);
    await service.verifyEmail({ token });
    expect(userService.verifyEmailToken).toHaveBeenCalledWith(createHash('sha256').update(token).digest('hex'));
  });

  it('can resend a verification link without revealing whether an email is registered', async () => {
    const response = await service.resendVerification({ email: ' AMINA@MSUMAIN.EDU.PH ' });
    expect(userService.updateEmailVerificationToken).toHaveBeenCalledWith(
      'amina@msumain.edu.ph',
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.any(Date),
    );
    expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
      'amina@msumain.edu.ph',
      expect.stringContaining('verify-email='),
    );
    expect(response.message).toContain('If this email has a pending account');
  });
});