import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { timingSafeEqual } from 'crypto';
import * as argon2 from 'argon2';
import { User, UserRole } from './entities/user.entity';
import { UserRoleAudit } from './entities/user-role-audit.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

export const normalizeUsername = (username: string): string => username.trim().toLowerCase();
const ADMIN_ACCOUNT_MUTATION_LOCK_ID = 1146110032;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.userRepo.findOneBy({ id });
  }

  findByMsuIdWithSchedules(msuIdNumber: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { msuIdNumber },
      relations: ['academicSchedules'],
    });
  }

  findByUsernameForAuth(username: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.username = :username', { username: normalizeUsername(username) })
      .getOne();
  }

  findAll(): Promise<User[]> {
    return this.userRepo.find({ order: { createdAt: 'DESC' } });
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    return this.saveNewUser(dto, dto.role ?? UserRole.STUDENT);
  }

  async createFirstAdmin(dto: Omit<CreateUserDto, 'role'>, providedSecret?: string): Promise<User> {
    const configuredSecret = this.config.get<string>('BOOTSTRAP_ADMIN_SECRET');
    if (!configuredSecret || !providedSecret || !this.secretsMatch(configuredSecret, providedSecret)) {
      throw new ForbiddenException('Admin bootstrap is unavailable');
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [ADMIN_ACCOUNT_MUTATION_LOCK_ID]);
      const repository = manager.getRepository(User);
      if ((await repository.count()) > 0) throw new ConflictException('Admin bootstrap is only available before user creation');

      const user = repository.create({
        ...this.userFields(dto),
        passwordHash,
        role: UserRole.ADMIN,
      });
      return this.saveWithConflictHandling(repository, user);
    });
  }

  async updateProfile(id: string, dto: UpdateUserProfileDto): Promise<User> {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    if (dto.username !== undefined) user.username = normalizeUsername(dto.username);
    if (dto.fullName !== undefined) user.fullName = dto.fullName.trim();
    if (dto.email !== undefined) user.email = dto.email.trim().toLowerCase();
    if (dto.phone !== undefined) user.phone = dto.phone?.trim() || null;
    if (dto.alternativeEmail !== undefined) {
      user.alternativeEmail = dto.alternativeEmail?.trim().toLowerCase() || null;
    }
    return this.saveWithConflictHandling(this.userRepo, user);
  }

  async assignRole(actorUserId: string, targetUserId: string, role: UserRole): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [ADMIN_ACCOUNT_MUTATION_LOCK_ID]);
      const repository = manager.getRepository(User);
      const user = await repository.findOne({
        where: { id: targetUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('User not found');
      if (user.role === role) return user;

      if (user.role === UserRole.ADMIN && role !== UserRole.ADMIN && (await repository.countBy({
        role: UserRole.ADMIN,
        isActive: true,
      })) <= 1) {
        throw new ConflictException('The last active administrator cannot be demoted');
      }

      const previousRole = user.role;
      user.role = role;
      const updatedUser = await repository.save(user);
      const auditRepository = manager.getRepository(UserRoleAudit);
      await auditRepository.save(auditRepository.create({
        actorUserId,
        targetUserId,
        oldRole: previousRole,
        newRole: role,
      }));
      return updatedUser;
    });
  }

  async setActiveStatus(id: string, isActive: boolean): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [ADMIN_ACCOUNT_MUTATION_LOCK_ID]);
      const repository = manager.getRepository(User);
      const user = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('User not found');
      if (user.role === UserRole.ADMIN && user.isActive && !isActive && (await repository.countBy({
        role: UserRole.ADMIN,
        isActive: true,
      })) <= 1) {
        throw new ConflictException('The last active administrator cannot be deactivated');
      }
      user.isActive = isActive;
      return repository.save(user);
    });
  }

  private async saveNewUser(dto: CreateUserDto, role: UserRole): Promise<User> {
    const user = this.userRepo.create({
      ...this.userFields(dto),
      passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }),
      role,
    });
    return this.saveWithConflictHandling(this.userRepo, user);
  }

  private userFields(dto: Pick<CreateUserDto, 'msuIdNumber' | 'username' | 'fullName' | 'email'>) {
    return {
      msuIdNumber: dto.msuIdNumber.trim(),
      username: normalizeUsername(dto.username),
      fullName: dto.fullName.trim(),
      email: dto.email.trim().toLowerCase(),
    };
  }

  private async saveWithConflictHandling(repository: Repository<User>, user: User): Promise<User> {
    try {
      return await repository.save(user);
    } catch (error) {
      if (error instanceof QueryFailedError && (error as any).driverError?.code === '23505') {
        throw new ConflictException('A user with one of these identifiers already exists');
      }
      throw error;
    }
  }

  private secretsMatch(expected: string, provided: string): boolean {
    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(provided);
    return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
  }
}