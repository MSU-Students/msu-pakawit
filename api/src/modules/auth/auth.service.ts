import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { UserService } from '../users/user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  private readonly dummyPasswordHash = argon2.hash(randomBytes(32), { type: argon2.argon2id });

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    this.emailService.assertConfigured();
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const ttlSeconds = Number(this.config.get('EMAIL_VERIFICATION_TOKEN_TTL_SECONDS') ?? 86400);
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error('EMAIL_VERIFICATION_TOKEN_TTL_SECONDS must be a positive integer');
    }

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const clientUrl = this.config.get<string>('CLIENT_URL') ?? 'http://localhost:5173';
    const verificationUrl = new URL(clientUrl);
    verificationUrl.searchParams.set('verify-email', rawToken);

    await this.userService.createPendingUser(dto, tokenHash, expiresAt);
    await this.emailService.sendVerificationEmail(dto.email.trim().toLowerCase(), verificationUrl.toString());

    return { message: 'Registration started. Check your email for the verification link.' };
  }

  async resendVerification(dto: ResendVerificationDto) {
    this.emailService.assertConfigured();
    const email = dto.email.trim().toLowerCase();
    const rawToken = randomBytes(32).toString('hex');
    const ttlSeconds = Number(this.config.get('EMAIL_VERIFICATION_TOKEN_TTL_SECONDS') ?? 86400);
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error('EMAIL_VERIFICATION_TOKEN_TTL_SECONDS must be a positive integer');
    }

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const clientUrl = this.config.get<string>('CLIENT_URL') ?? 'http://localhost:5173';
    const verificationUrl = new URL(clientUrl);
    verificationUrl.searchParams.set('verify-email', rawToken);
    const isPending = await this.userService.updateEmailVerificationToken(
      email,
      this.hashToken(rawToken),
      expiresAt,
    );
    if (isPending) {
      await this.emailService.sendVerificationEmail(email, verificationUrl.toString());
    }

    return { message: 'If this email has a pending account, a verification link has been sent.' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    if (!/^[a-f0-9]{64}$/i.test(dto.token)) {
      throw new BadRequestException('The verification link is invalid or has expired');
    }
    await this.userService.verifyEmailToken(this.hashToken(dto.token));
    return { message: 'Email verified. You can now sign in.' };
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByUsernameForAuth(dto.username);
    let passwordMatches: boolean;
    try {
      const hashToVerify = user?.passwordHash ?? (await this.dummyPasswordHash);
      passwordMatches = await argon2.verify(hashToVerify, dto.password);
    } catch {
      passwordMatches = false;
    }

    if (!user || !user.isActive || user.emailVerified === false || !passwordMatches) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const expiresIn = Number(this.config.get('JWT_ACCESS_TOKEN_TTL_SECONDS') ?? 3600);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}