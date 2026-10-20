import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from '../modules/auth/auth.controller';
import { AuthService } from '../modules/auth/auth.service';

describe('AuthController', () => {
  let app;
  const authService = {
    login: jest.fn().mockResolvedValue({ accessToken: 'token', tokenType: 'Bearer', expiresIn: 3600 }),
    register: jest.fn().mockResolvedValue({ message: 'If the address can receive registration mail, instructions will be sent shortly.' }),
    verifyEmail: jest.fn().mockResolvedValue({ message: 'Email verified successfully.' }),
    resendVerification: jest.fn().mockResolvedValue({ message: 'If a pending registration exists, a fresh verification email will be sent.' }),
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

  it('normalizes username case and surrounding whitespace before login', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: ' Amina.Radiamoda ', password: 'password123' })
      .expect(201);

    expect(authService.login).toHaveBeenCalledWith({ username: 'amina.radiamoda', password: 'password123' });
  });

  it('accepts a verified account email as the existing login identifier', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: ' AMINA@MSUMAIN.EDU.PH ', password: 'password123' })
      .expect(201);
    expect(authService.login).toHaveBeenCalledWith({
      username: 'amina@msumain.edu.ph',
      password: 'password123',
    });
  });

  it('rejects malformed and non-whitelisted login fields', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({ username: '', password: '' }).expect(400);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'amina', password: 'password123', role: 'ADMIN' })
      .expect(400);
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('accepts registration and returns the same generic accepted response', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: ' AMINA@MSUMAIN.EDU.PH ',
        fullName: ' Amina Radiamoda ',
        password: 'password123',
        role: 'COURIER',
      })
      .expect(202)
      .expect({
        message: 'If the address can receive registration mail, instructions will be sent shortly.',
      });

    expect(authService.register).toHaveBeenCalledWith(
      {
        email: 'amina@msumain.edu.ph',
        fullName: 'Amina Radiamoda',
        password: 'password123',
        role: 'COURIER',
      },
      expect.any(String),
    );
  });

  it('rejects invalid registration fields before invoking the service', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', fullName: '', password: 'short' })
      .expect(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: expect.any(String),
    });
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('accepts verification and resend requests', async () => {
    await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ token: 'a'.repeat(43) })
      .expect(200)
      .expect({ message: 'Email verified successfully.' });
    await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .send({ email: 'amina@msumain.edu.ph' })
      .expect(202)
      .expect({
        message: 'If a pending registration exists, a fresh verification email will be sent.',
      });
  });
});