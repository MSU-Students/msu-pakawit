import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { UserController } from '../modules/users/user.controller';
import { UserRole } from '../modules/users/entities/user.entity';
import { ActiveUserGuard } from '../modules/users/active-user.guard';
import { RolesGuard } from '../modules/users/roles.guard';
import { JwtAuthGuard } from '../modules/shared/security/jwt-auth.guard';
import { UserService } from '../modules/users/user.service';

describe('UserController authorization', () => {
  let app;
  const user = {
    id: 'user-1',
    msuIdNumber: '2026-01429',
    username: 'amina.radiamoda',
    passwordHash: 'never-return-this-hash',
    fullName: 'Amina Radiamoda',
    email: 'amina@msumain.edu.ph',
    role: UserRole.ADMIN,
    isCourierVerified: false,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const userService = {
    findById: jest.fn(),
    createUser: jest.fn().mockResolvedValue(user),
  };
  const jwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: JwtService, useValue: jwtService },
        JwtAuthGuard,
        RolesGuard,
        ActiveUserGuard,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('rejects account provisioning without authentication', async () => {
    await request(app.getHttpServer()).post('/users').send({}).expect(401);
  });

  it('rejects a non-admin even if the token contains an ADMIN claim', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', username: user.username, role: UserRole.ADMIN });
    userService.findById.mockResolvedValue({ ...user, role: UserRole.STUDENT });

    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', 'Bearer signed-token')
      .send({})
      .expect(403);
    expect(userService.createUser).not.toHaveBeenCalled();
  });

  it('allows an active admin and never returns the password hash', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', username: user.username, role: UserRole.ADMIN });
    userService.findById.mockResolvedValue(user);

    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', 'Bearer signed-token')
      .send({})
      .expect(201);

    expect(response.body.username).toBe(user.username);
    expect(response.body.passwordHash).toBeUndefined();
  });
});