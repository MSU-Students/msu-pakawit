import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, QueryFailedError, Repository } from 'typeorm';
import { UserService } from '../users/user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegistrationVerification } from './entities/registration-verification.entity';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  private readonly dummyPasswordHash = argon2.hash(randomBytes(32), { type: argon2.argon2id });

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RegistrationVerification)
    private readonly verificationRepo: Repository<RegistrationVerification>,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const username = dto.username.trim().toLowerCase();
    const email = dto.email.trim().toLowerCase();
    const msuIdNumber = dto.msuIdNumber.trim();

    await this.verificationRepo.delete({ expiresAt: LessThanOrEqual(new Date()) });
    await this.userService.ensureRegistrationIdentifiersAvailable({ username, email, msuIdNumber });
    const pendingDuplicate = await this.verificationRepo.findOne({
      where: [{ username }, { email }, { msuIdNumber }],
    });
    if (pendingDuplicate) {
      throw new ConflictException('An account registration is already pending for one of these identifiers');
    }

    const token = randomBytes(32).toString('hex');
    const ttlMinutes = Number(this.config.get<string>('REGISTRATION_VERIFICATION_TTL_MINUTES') ?? 30);
    if (!Number.isSafeInteger(ttlMinutes) || ttlMinutes < 1 || ttlMinutes > 1440) {
      throw new ServiceUnavailableException('Email verification expiry is not configured correctly');
    }
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const verification = this.verificationRepo.create({
      username,
      email,
      msuIdNumber,
      fullName: dto.fullName.trim(),
      role: dto.role,
      passwordHash,
      tokenHash: this.hashToken(token),
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
    });

    try {
      await this.verificationRepo.save(verification);
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        throw new ConflictException('An account registration is already pending for one of these identifiers');
      }
      throw error;
    }

    const clientUrl = this.config.get<string>('CLIENT_URL') ?? 'http://localhost:3000';
    const verificationUrl = `${clientUrl.replace(/\/+$/, '')}/?verifyEmail=${encodeURIComponent(token)}`;
    try {
      await this.emailService.sendRegistrationVerification(email, verification.fullName, verificationUrl);
    } catch (error) {
      await this.verificationRepo.delete({ id: verification.id });
      throw error;
    }

    return { message: 'Check your email for a verification link to complete registration.' };
  }

  async verifyEmail(token: string): Promise<{
    message: string;
    user: { id: string; username: string; fullName: string; role: string };
  }> {
    const tokenHash = this.hashToken(token);

    const user = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(RegistrationVerification);
      const verification = await repository.findOne({
        where: { tokenHash },
        lock: { mode: 'pessimistic_write' },
      });

      if (!verification || verification.expiresAt.getTime() <= Date.now()) {
        throw new BadRequestException('Verification link is invalid or expired');
      }

      const user = await this.userService.createVerifiedUser(manager, verification);
      await repository.remove(verification);
      return {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      };
    });

    return { message: 'Email verified. Your account is ready; you can now sign in.', user };
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

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return error instanceof QueryFailedError && error.driverError?.code === '23505';
  }
}