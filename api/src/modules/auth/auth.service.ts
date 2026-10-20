import {
  BadRequestException,
  GoneException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { DataSource, QueryFailedError } from 'typeorm';
import * as argon2 from 'argon2';
import { UserService } from '../users/user.service';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PendingRegistration } from './entities/pending-registration.entity';
import { EMAIL_SENDER, EmailSender } from './email/email-sender';
import { RegistrationRateLimiter } from './registration-rate-limiter';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly dummyPasswordHash = argon2.hash(randomBytes(32), { type: argon2.argon2id });

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    private readonly rateLimiter: RegistrationRateLimiter,
  ) {}

  async register(dto: RegisterDto, ip: string) {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();
    this.validateEmailDomain(email);
    this.validatePasswordLength(dto.password);
    this.rateLimiter.consume(email, ip);

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const existingUser = await this.userService.findByEmailForAuth(email);
    if (existingUser) {
      await this.emailSender.sendAlreadyRegisteredEmail(email);
      this.logger.log('Registration request matched an existing user');
      return { message: 'If the address can receive registration mail, instructions will be sent shortly.' };
    }

    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    const expiresAt = this.getExpiry(now);

    await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [email]);
      const repository = manager.getRepository(PendingRegistration);
      const existing = await repository.findOneBy({ email });
      const pending = repository.create({
        ...(existing ? { id: existing.id } : {}),
        email,
        passwordHash,
        fullName,
        role: dto.role,
        tokenHash: this.hashToken(token),
        expiresAt,
        lastSentAt: now,
        resendCount: existing ? existing.resendCount + 1 : 0,
      });
      await repository.save(pending);
    });

    await this.emailSender.sendVerificationEmail(
      email,
      fullName,
      this.verificationUrl(token),
      expiresAt,
    );
    this.logger.log('Registration verification email requested');
    return { message: 'If the address can receive registration mail, instructions will be sent shortly.' };
  }

  async verifyEmail(token: string) {
    const tokenHash = this.hashToken(token);
    let user: User;
    try {
      user = await this.dataSource.transaction(async (manager) => {
        const pendingRepository = manager.getRepository(PendingRegistration);
        const pending = await pendingRepository
          .createQueryBuilder('pending')
          .addSelect('pending.passwordHash')
          .where('pending.tokenHash = :tokenHash', { tokenHash })
          .setLock('pessimistic_write')
          .getOne();

        if (!pending) throw this.invalidToken();
        if (pending.expiresAt.getTime() <= Date.now()) {
          throw new GoneException({
            code: 'LINK_EXPIRED',
            message: 'Verification link expired. Request a new one.',
          });
        }

        const userRepository = manager.getRepository(User);
        const existingUser = await userRepository
          .createQueryBuilder('user')
          .where('LOWER(user.email) = :email', { email: pending.email })
          .getOne();
        if (existingUser) {
          await pendingRepository.delete(pending.id);
          return null;
        }

        const newUser = userRepository.create({
          msuIdNumber: null,
          username: pending.email,
          passwordHash: pending.passwordHash,
          fullName: pending.fullName,
          email: pending.email,
          emailVerified: true,
          role: pending.role,
        });
        const savedUser = await userRepository.save(newUser);
        await pendingRepository.delete(pending.id);
        return savedUser;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) throw this.invalidToken();
      throw error;
    }

    if (!user) throw this.invalidToken();
    this.logger.log('Email verification completed and account created');
    return { message: 'Email verified successfully.' };
  }

  async resendVerification(emailInput: string, ip: string) {
    const email = emailInput.trim().toLowerCase();
    this.rateLimiter.consume(email, ip);

    const existingUser = await this.userService.findByEmailForAuth(email);
    if (existingUser) {
      await this.emailSender.sendAlreadyRegisteredEmail(email);
      return { message: 'If a pending registration exists, a fresh verification email will be sent.' };
    }

    const now = new Date();
    const token = randomBytes(32).toString('base64url');
    const expiresAt = this.getExpiry(now);
    const pending = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(PendingRegistration);
      const registration = await repository.findOne({
        where: { email },
        lock: { mode: 'pessimistic_write' },
      });
      if (!registration) return null;
      registration.tokenHash = this.hashToken(token);
      registration.expiresAt = expiresAt;
      registration.lastSentAt = now;
      registration.resendCount += 1;
      await repository.save(registration);
      return registration;
    });

    if (pending) {
      await this.emailSender.sendVerificationEmail(email, pending.fullName, this.verificationUrl(token), expiresAt);
      this.logger.log('Verification email resent');
    }
    return { message: 'If a pending registration exists, a fresh verification email will be sent.' };
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

    if (!user || !user.isActive || !passwordMatches) throw new UnauthorizedException('Invalid username or password');

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

  private validateEmailDomain(email: string): void {
    const domains = (this.config.get<string>('ALLOWED_EMAIL_DOMAINS') ?? '')
      .split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean);
    if (domains.length === 0) return;

    const emailDomain = email.slice(email.lastIndexOf('@') + 1);
    if (!domains.includes(emailDomain)) {
      throw new BadRequestException({
        code: 'EMAIL_DOMAIN_NOT_ALLOWED',
        message: 'This email domain is not allowed.',
      });
    }
  }

  private validatePasswordLength(password: string): void {
    const configured = this.config.get<string>('PASSWORD_MIN_LENGTH');
    const minimum = configured === undefined ? 8 : Number(configured);
    if (!Number.isSafeInteger(minimum) || minimum < 8 || minimum > 128) {
      throw new Error('PASSWORD_MIN_LENGTH must be an integer between 8 and 128');
    }
    if (password.length < minimum) {
      throw new BadRequestException({
        code: 'PASSWORD_TOO_SHORT',
        message: `Password must be at least ${minimum} characters.`,
      });
    }
  }

  private getExpiry(now: Date): Date {
    const configured = this.config.get<string>('VERIFICATION_TOKEN_TTL_HOURS');
    const ttlHours = configured === undefined ? 24 : Number(configured);
    if (!Number.isFinite(ttlHours) || ttlHours <= 0) {
      throw new Error('VERIFICATION_TOKEN_TTL_HOURS must be a positive number');
    }
    const expiry = now.getTime() + ttlHours * 60 * 60 * 1000;
    if (!Number.isFinite(expiry)) throw new Error('VERIFICATION_TOKEN_TTL_HOURS is too large');
    return new Date(expiry);
  }

  private verificationUrl(token: string): string {
    const baseUrl = (this.config.get<string>('APP_BASE_URL') ?? 'http://localhost:5173').replace(/\/+$/, '');
    const parsedUrl = new URL(baseUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('APP_BASE_URL must use HTTP or HTTPS');
    }
    return `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  private invalidToken(): BadRequestException {
    return new BadRequestException({
      code: 'INVALID_OR_USED_LINK',
      message: 'Invalid or already used verification link.',
    });
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    return (error.driverError as { code?: string }).code === '23505';
  }
}