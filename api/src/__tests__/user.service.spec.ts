import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { UserRoleAudit } from '../modules/users/entities/user-role-audit.entity';
import { UserService } from '../modules/users/user.service';

describe('UserService', () => {
  let service: UserService;
  let repository: any;
  let auditRepository: any;
  let manager: any;
  let dataSource: any;
  let config: { get: jest.Mock };

  beforeEach(() => {
    repository = {
      create: jest.fn((user) => user),
      save: jest.fn(async (user) => user),
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      countBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    auditRepository = {
      create: jest.fn((audit) => audit),
      save: jest.fn(async (audit) => audit),
    };
    manager = {
      query: jest.fn(),
      getRepository: jest.fn((entity) => entity === User ? repository : auditRepository),
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

  it('saves a role change and its actor audit record in the same transaction', async () => {
    const target = {
      id: 'target-user',
      role: UserRole.STUDENT,
      isActive: true,
    };
    repository.findOne.mockResolvedValue(target);
    repository.countBy.mockResolvedValue(2);

    const updated = await service.assignRole('admin-user', 'target-user', UserRole.COURIER);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.query).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock($1)', [1146110032]);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'target-user' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(updated.role).toBe(UserRole.COURIER);
    expect(auditRepository.create).toHaveBeenCalledWith({
      actorUserId: 'admin-user',
      targetUserId: 'target-user',
      oldRole: UserRole.STUDENT,
      newRole: UserRole.COURIER,
    });
    expect(auditRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: 'admin-user',
      targetUserId: 'target-user',
      oldRole: UserRole.STUDENT,
      newRole: UserRole.COURIER,
    }));
  });

  it('does not create an audit record when the role is unchanged', async () => {
    repository.findOne.mockResolvedValue({
      id: 'target-user',
      role: UserRole.STUDENT,
      isActive: true,
    });

    await service.assignRole('admin-user', 'target-user', UserRole.STUDENT);

    expect(auditRepository.save).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });
});