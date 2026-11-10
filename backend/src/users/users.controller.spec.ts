import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  type INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from './enums/user-role.enum.js';

describe('UsersController', () => {
  let controller: UsersController;
  let app: INestApplication<App>;

  const mockUsersService = {
    getProfileWithStats: vi.fn().mockResolvedValue({ id: 'u-1', fullName: 'Ram' }),
    updateProfile: vi.fn().mockResolvedValue({ id: 'u-1', fullName: 'Ram Updated' }),
    changePassword: vi.fn().mockResolvedValue({ message: 'Password updated successfully' }),
  };

  const mockUser: AuthenticatedUser = {
    id: 'u-1',
    fullName: 'Ram',
    email: 'ram@example.com',
    role: UserRole.USER,
    isActive: true,
    isVerified: false,
    items: [],
    claims: [],
    reviewedClaims: [],
    handedOverItems: [],
    receivedItems: [],
    notifications: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdmin: AuthenticatedUser = {
    ...mockUser,
    id: 'admin-1',
    fullName: 'Admin',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  let activeUser: AuthenticatedUser = mockUser;

  const mockJwtGuard: CanActivate = {
    canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
      req.user = activeUser;
      return true;
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    activeUser = mockUser;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        Reflector,
        RolesGuard,
        { provide: UsersService, useValue: mockUsersService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns current user profile with stats', async () => {
    const res = await controller.getProfile(mockUser);
    expect(res.fullName).toBe('Ram');
    expect(mockUsersService.getProfileWithStats).toHaveBeenCalledWith('u-1');
  });

  it('updates current user profile', async () => {
    const res = await controller.updateProfile(mockUser, { fullName: 'Ram Updated' });
    expect(res.fullName).toBe('Ram Updated');
  });

  it('allows USER on /users/me endpoints and blocks ADMIN with 403', async () => {
    activeUser = mockAdmin;
    await request(app.getHttpServer())
      .get('/users/me')
      .expect(HttpStatus.FORBIDDEN);
    await request(app.getHttpServer())
      .patch('/users/me')
      .send({ fullName: 'Nope' })
      .expect(HttpStatus.FORBIDDEN);
    await request(app.getHttpServer())
      .patch('/users/me/password')
      .send({ currentPassword: 'old', newPassword: 'newpassword123' })
      .expect(HttpStatus.FORBIDDEN);

    activeUser = mockUser;
    await request(app.getHttpServer())
      .get('/users/me')
      .expect(HttpStatus.OK);
  });
});
