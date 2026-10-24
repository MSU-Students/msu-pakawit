import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { UserService } from '../modules/users/user.service';

describe('UserService', () => {
  let service: UserService;
  let repository: any;
  let manager: any;
  let dataSource: any;
  let config: { get: jest.Mock };

  beforeEach(() => {
    repository = {
      create: jest.fn((user) => user),
      save: jest.fn(async (user) => user),
      findOneBy: jest.fn(),
      find: jest.fn(),
      countBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    manager = {
      query: jest.fn(),
      getRepository: jest.fn().mockReturnValue(repository),
    };
    dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    config = { get: jest.fn().mockReturnValue('bootstrap-secret-for-tests') };
    service = new UserService(
      repository as Repository<User>,
      dataSource as DataSource,
      config as unknown as ConfigService,
    );
  });

  it('normalizes usernames and stores only an Argon2id password hash', async () => {
    const created = await service.createUser({
      msuIdNumber: ' 2026-01429 ',
      username: ' Amina.Radiamoda ',
      fullName: ' Amina Radiamoda ',
      email: ' AMINA@MSUMAIN.EDU.PH ',
      password: 'correct horse battery staple',
    });

    expect(created.username).toBe('amina.radiamoda');
    expect(created.msuIdNumber).toBe('2026-01429');
    expect(created.fullName).toBe('Amina Radiamoda');
    expect(created.email).toBe('amina@msumain.edu.ph');
    expect(await argon2.verify(created.passwordHash, 'correct horse battery staple')).toBe(true);
    expect(created.passwordHash).not.toBe('correct horse battery staple');
    expect(created.role).toBe(UserRole.STUDENT);
  });

  it('creates an unverified account with a hashed password and an expiring token hash', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const pending = await service.createPendingUser({
      msuIdNumber: '2026-01429',
      username: 'amina.radiamoda',
      fullName: 'Amina Radiamoda',
      email: 'amina@msumain.edu.ph',
      password: 'correct horse battery staple',
    }, 'hashed-token', expiresAt);

    expect(pending.emailVerified).toBe(false);
    expect(pending.emailVerificationTokenHash).toBe('hashed-token');
    expect(pending.emailVerificationExpiresAt).toBe(expiresAt);
    expect(await argon2.verify(pending.passwordHash, 'correct horse battery staple')).toBe(true);
  });

  it('marks an account verified once only while its token is unexpired', async () => {
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    repository.createQueryBuilder.mockReturnValue(queryBuilder);

    await service.verifyEmailToken('hashed-token');

    expect(queryBuilder.update).toHaveBeenCalledWith(User);
    expect(queryBuilder.set).toHaveBeenCalledWith({
      emailVerified: true,
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('emailVerificationExpiresAt > :now', expect.any(Object));

    queryBuilder.execute.mockResolvedValueOnce({ affected: 0 });
    await expect(service.verifyEmailToken('hashed-token')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rotates verification tokens only for pending accounts', async () => {
    const queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    repository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(service.updateEmailVerificationToken(
      ' AMINA@MSUMAIN.EDU.PH ',
      'next-token-hash',
      new Date(Date.now() + 60_000),
    )).resolves.toBe(true);
    expect(queryBuilder.where).toHaveBeenCalledWith('email = :email', { email: 'amina@msumain.edu.ph' });

    queryBuilder.execute.mockResolvedValueOnce({ affected: 0 });
    await expect(service.updateEmailVerificationToken(
      'amina@msumain.edu.ph',
      'next-token-hash',
      new Date(Date.now() + 60_000),
    )).resolves.toBe(false);
  });

  it('creates the first administrator only with the bootstrap secret and an empty table', async () => {
    repository.count = jest.fn().mockResolvedValue(0);
    const admin = await service.createFirstAdmin({
      msuIdNumber: '2026-00001',
      username: 'first.admin',
      fullName: 'First Admin',
      email: 'admin@msumain.edu.ph',
      password: 'correct horse battery staple',
    }, 'bootstrap-secret-for-tests');

    expect(manager.query).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock($1)', [1146110032]);
    expect(admin.role).toBe(UserRole.ADMIN);
    expect(await argon2.verify(admin.passwordHash, 'correct horse battery staple')).toBe(true);
  });

  it('rejects bootstrap without a valid secret or after another user exists', async () => {
    await expect(service.createFirstAdmin({
      msuIdNumber: '2026-00001',
      username: 'first.admin',
      fullName: 'First Admin',
      email: 'admin@msumain.edu.ph',
      password: 'correct horse battery staple',
    }, 'wrong-secret')).rejects.toBeInstanceOf(ForbiddenException);

    repository.count = jest.fn().mockResolvedValue(1);
    await expect(service.createFirstAdmin({
      msuIdNumber: '2026-00001',
      username: 'first.admin',
      fullName: 'First Admin',
      email: 'admin@msumain.edu.ph',
      password: 'correct horse battery staple',
    }, 'bootstrap-secret-for-tests')).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps duplicate identifier database errors to a conflict response', async () => {
    repository.save.mockRejectedValueOnce(
      new QueryFailedError('INSERT', [], { code: '23505' } as any),
    );
    await expect(service.createUser({
      msuIdNumber: '2026-01429',
      username: 'amina.radiamoda',
      fullName: 'Amina Radiamoda',
      email: 'amina@msumain.edu.ph',
      password: 'correct horse battery staple',
    })).rejects.toBeInstanceOf(ConflictException);
  });
});