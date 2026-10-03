import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from '../modules/auth/auth.service';
import { UserRole } from '../modules/users/entities/user.entity';
import { UserService } from '../modules/users/user.service';

describe('AuthService', () => {
  let service: AuthService;
  let userService: { findByUsernameForAuth: jest.Mock };
  let jwtService: { signAsync: jest.Mock };
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
    };
    userService = { findByUsernameForAuth: jest.fn().mockResolvedValue(user) };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed-access-token') };

    service = new AuthService(
      userService as unknown as UserService,
      jwtService as unknown as JwtService,
      { get: jest.fn().mockReturnValue(3600) } as unknown as ConfigService,
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
    for (const candidate of [null, user, { ...user, isActive: false }]) {
      userService.findByUsernameForAuth.mockResolvedValueOnce(candidate);
      try {
        await service.login({ username: 'amina.radiamoda', password: 'incorrect password' });
      } catch (error) {
        errors.push(error);
      }
    }

    expect(errors).toHaveLength(3);
    expect(errors.every((error) => error instanceof UnauthorizedException)).toBe(true);
    expect(errors.map((error: UnauthorizedException) => error.message)).toEqual([
      'Invalid username or password',
      'Invalid username or password',
      'Invalid username or password',
    ]);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});