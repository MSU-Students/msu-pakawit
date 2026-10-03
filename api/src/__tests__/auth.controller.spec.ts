import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from '../modules/auth/auth.controller';
import { AuthService } from '../modules/auth/auth.service';

describe('AuthController', () => {
  let app;
  const authService = {
    login: jest.fn().mockResolvedValue({ accessToken: 'token', tokenType: 'Bearer', expiresIn: 3600 }),
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

  it('rejects malformed and non-whitelisted login fields', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({ username: '', password: '' }).expect(400);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'amina', password: 'password123', role: 'ADMIN' })
      .expect(400);
    expect(authService.login).not.toHaveBeenCalled();
  });
});