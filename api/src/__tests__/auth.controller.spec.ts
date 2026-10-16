import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from '../modules/auth/auth.controller';
import { AuthService } from '../modules/auth/auth.service';

describe('AuthController', () => {
  let app;
  const authService = {
    login: jest.fn().mockResolvedValue({ accessToken: 'token', tokenType: 'Bearer', expiresIn: 3600 }),
    register: jest.fn().mockResolvedValue({ message: 'Check your email.' }),
    verifyEmail: jest.fn().mockResolvedValue({ message: 'Email verified.' }),
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

  it('accepts a valid login request', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'amina.radiamoda', password: 'password123' })
      .expect(201)
      .expect({ accessToken: 'token', tokenType: 'Bearer', expiresIn: 3600 });
  });

  it('accepts registration with one of the public roles but rejects ADMIN', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        msuIdNumber: '2026-01429',
        username: 'amina.radiamoda',
        fullName: 'Amina Radiamoda',
        email: 'amina@msumain.edu.ph',
        password: 'a-long-registration-password',
        role: 'COURIER',
      })
      .expect(201)
      .expect({ message: 'Check your email.' });

    expect(authService.register).toHaveBeenCalledWith(expect.objectContaining({
      username: 'amina.radiamoda',
      email: 'amina@msumain.edu.ph',
      role: 'COURIER',
    }));

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        msuIdNumber: '2026-01429',
        username: 'amina.radiamoda',
        fullName: 'Amina Radiamoda',
        email: 'amina@msumain.edu.ph',
        password: 'a-long-registration-password',
        role: 'ADMIN',
      })
      .expect(400);
  });

  it('validates email verification tokens', async () => {
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: 'one-time-token' })
      .expect(201)
      .expect({ message: 'Email verified.' });

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: '' })
      .expect(400);
  });

  it('normalizes username case and surrounding whitespace before login', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: ' Amina.Radiamoda ', password: 'password123' })
      .expect(201);

    expect(authService.login).toHaveBeenCalledWith({ username: 'amina.radiamoda', password: 'password123' });
  });

  it('rejects malformed and non-whitelisted login fields', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({ username: '', password: '' }).expect(400);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'amina', password: 'password123', role: 'ADMIN' })
      .expect(400);
    expect(authService.login).not.toHaveBeenCalled();
  });
});