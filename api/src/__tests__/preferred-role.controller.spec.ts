import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { UserController } from '../modules/users/user.controller';
import { SelectableRole, UserRole } from '../modules/users/entities/user.entity';
import { ActiveUserGuard } from '../modules/users/active-user.guard';
import { RolesGuard } from '../modules/users/roles.guard';
import { JwtAuthGuard } from '../modules/shared/security/jwt-auth.guard';
import { UserService } from '../modules/users/user.service';

describe('UserController preferred role', () => {
  let app;
  const user = {
    id: 'user-1',
    msuIdNumber: '2026-01429',
    username: 'amina.radiamoda',
    passwordHash: 'never-return-this-hash',
    fullName: 'Amina Radiamoda',
    email: 'amina@msumain.edu.ph',
    role: UserRole.STUDENT,
    preferredRole: SelectableRole.STUDENT,
    isCourierVerified: false,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const userService = {
    findById: jest.fn(),
    updatePreferredRole: jest.fn(),
    assignRole: jest.fn(),
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('returns the saved preference on the authenticated profile', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: user.id, username: user.username, role: UserRole.STUDENT });
    userService.findById.mockResolvedValue({ ...user, preferredRole: SelectableRole.EMPLOYEE });

    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', 'Bearer signed-token')
      .expect(200);

    expect(response.body.preferredRole).toBe(SelectableRole.EMPLOYEE);
    expect(response.body.role).toBe(UserRole.STUDENT);
    expect(response.body.passwordHash).toBeUndefined();
  });

  it('rejects unauthenticated role preference updates', async () => {
    await request(app.getHttpServer())
      .patch('/users/me/preferred-role')
      .send({ preferredRole: SelectableRole.COURIER })
      .expect(401);
    expect(userService.updatePreferredRole).not.toHaveBeenCalled();
  });

  it('saves a selectable preference for the authenticated user without changing account role', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: user.id, username: user.username, role: UserRole.STUDENT });
    userService.findById.mockResolvedValue(user);
    userService.updatePreferredRole.mockResolvedValue({ ...user, preferredRole: SelectableRole.COURIER });

    const response = await request(app.getHttpServer())
      .patch('/users/me/preferred-role')
      .set('Authorization', 'Bearer signed-token')
      .send({ preferredRole: SelectableRole.COURIER })
      .expect(200);

    expect(userService.updatePreferredRole).toHaveBeenCalledWith(user.id, SelectableRole.COURIER);
    expect(userService.assignRole).not.toHaveBeenCalled();
    expect(response.body.preferredRole).toBe(SelectableRole.COURIER);
    expect(response.body.role).toBe(UserRole.STUDENT);
    expect(response.body.passwordHash).toBeUndefined();
  });

  it('rejects ADMIN self-assignment through the preference endpoint', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: user.id, username: user.username, role: UserRole.STUDENT });
    userService.findById.mockResolvedValue(user);

    await request(app.getHttpServer())
      .patch('/users/me/preferred-role')
      .set('Authorization', 'Bearer signed-token')
      .send({ preferredRole: UserRole.ADMIN })
      .expect(400);

    expect(userService.updatePreferredRole).not.toHaveBeenCalled();
    expect(userService.assignRole).not.toHaveBeenCalled();
  });
});
