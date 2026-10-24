import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from '../modules/auth/auth.controller';
import { AuthService } from '../modules/auth/auth.service';
import { SelectableRole, UserRole } from '../modules/users/entities/user.entity';

describe('AuthController public registration', () => {
  let app;
  const createdUser = {
    id: 'user-1',
    msuIdNumber: '2026-01429',
    username: 'amina.radiamoda',
    fullName: 'Amina Radiamoda',
    email: 'amina@msumain.edu.ph',
    role: UserRole.EMPLOYEE,
    preferredRole: SelectableRole.EMPLOYEE,
    isCourierVerified: false,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  const validBody = {
    msuIdNumber: '2026-01429',
    username: 'amina.radiamoda',
    fullName: 'Amina Radiamoda',
    email: 'amina@msumain.edu.ph',
    password: 'correct horse battery staple',
    role: SelectableRole.EMPLOYEE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it.each([SelectableRole.STUDENT, SelectableRole.EMPLOYEE, SelectableRole.COURIER])(
    'accepts public registration for %s',
    async (role) => {
      authService.register.mockResolvedValue({ ...createdUser, role, preferredRole: role });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...validBody, role })
        .expect(201);

      expect(authService.register).toHaveBeenCalledWith(expect.objectContaining({ role }));
      expect(response.body.role).toBe(role);
      expect(response.body.preferredRole).toBe(role);
      expect(response.body.passwordHash).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain(validBody.password);
    },
  );

  it('rejects a missing role before the service is called', async () => {
    const { role: _role, ...withoutRole } = validBody;
    await request(app.getHttpServer()).post('/auth/register').send(withoutRole).expect(400);
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('rejects invalid and ADMIN roles during public registration', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({ ...validBody, role: 'ADMIN' }).expect(400);
    await request(app.getHttpServer()).post('/auth/register').send({ ...validBody, role: 'SUPERUSER' }).expect(400);
    expect(authService.register).not.toHaveBeenCalled();
  });
});
