import {
  type CanActivate,
  type ExecutionContext,
  ClassSerializerInterceptor,
  HttpStatus,
  UnauthorizedException,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

describe('AuthController', () => {
  let controller: AuthController;
  let app: INestApplication<App>;
  let allowJwtGuard = true;

  const authenticatedUser = {
    id: 'u-1',
    fullName: 'Aashish Thapa',
    email: 'a@example.com',
    role: UserRole.USER,
    isActive: true,
    isVerified: false,
  } as AuthenticatedUser;

  const mockAuthService = {
    register: vi.fn().mockResolvedValue({
      accessToken: 'register-jwt-tok',
      user: authenticatedUser,
    }),
    login: vi.fn().mockResolvedValue({
      accessToken: 'login-jwt-tok',
      user: authenticatedUser,
    }),
    getCurrentUser: vi.fn().mockResolvedValue(authenticatedUser),
  };

  const mockJwtGuard: CanActivate = {
    canActivate(context: ExecutionContext) {
      if (!allowJwtGuard) {
        throw new UnauthorizedException('Authentication required');
      }
      const req = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
      req.user = authenticatedUser;
      return true;
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    allowJwtGuard = true;
    mockAuthService.register.mockResolvedValue({
      accessToken: 'register-jwt-tok',
      user: authenticatedUser,
    });
    mockAuthService.login.mockResolvedValue({
      accessToken: 'login-jwt-tok',
      user: authenticatedUser,
    });
    mockAuthService.getCurrentUser.mockResolvedValue(authenticatedUser);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('calls register, login, and getMe methods cleanly', async () => {
    const reg = await controller.register({
      fullName: 'Aashish Thapa',
      email: 'a@example.com',
      password: 'secret123',
    });
    expect(reg.accessToken).toBe('register-jwt-tok');

    const log = await controller.login({
      email: 'a@example.com',
      password: 'secret123',
    });
    expect(log.accessToken).toBe('login-jwt-tok');

    const me = await controller.getMe(authenticatedUser);
    expect(me.id).toBe('u-1');
  });

  it('POST /auth/login returns 200 OK with accessToken for valid LoginDto', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@example.com', password: 'secret123' })
      .expect(HttpStatus.OK);

    expect(res.body.accessToken).toBe('login-jwt-tok');
    expect(res.body.user.email).toBe('a@example.com');
    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'a@example.com',
      password: 'secret123',
    });
  });

  it('POST /auth/login rejects malformed body or unknown properties with 400 Bad Request', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'not-an-email', password: '', unexpectedField: 'hack' })
      .expect(HttpStatus.BAD_REQUEST);

    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('POST /auth/login propagates UnauthorizedException as 401', async () => {
    mockAuthService.login.mockRejectedValueOnce(
      new UnauthorizedException('Invalid email or password'),
    );

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@example.com', password: 'wrong-password' })
      .expect(HttpStatus.UNAUTHORIZED);

    expect(res.body.message).toBe('Invalid email or password');
  });

  it('POST /auth/register validates DTO and returns 201 Created', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ fullName: 'A', email: 'bad', password: '12' })
      .expect(HttpStatus.BAD_REQUEST);

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        fullName: 'Aashish Thapa',
        email: 'a@example.com',
        password: 'password123',
      })
      .expect(HttpStatus.CREATED);

    expect(res.body.accessToken).toBe('register-jwt-tok');
  });

  it('GET /auth/me enforces guard and returns authenticated user profile', async () => {
    allowJwtGuard = false;
    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(HttpStatus.UNAUTHORIZED);

    allowJwtGuard = true;
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .expect(HttpStatus.OK);

    expect(res.body.id).toBe('u-1');
    expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith('u-1');
  });
});
