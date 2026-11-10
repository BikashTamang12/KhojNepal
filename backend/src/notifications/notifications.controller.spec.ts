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
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let app: INestApplication<App>;

  const mockService = {
    findForUser: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 1 } }),
    getUnreadCount: vi.fn().mockResolvedValue({ unreadCount: 2 }),
    markAllAsRead: vi.fn().mockResolvedValue({ updated: 2 }),
    markAsRead: vi.fn().mockResolvedValue({ id: 'n-1', isRead: true }),
  };
  const user = { id: 'u-1', role: UserRole.USER } as AuthenticatedUser;
  const admin = { id: 'admin-1', role: UserRole.ADMIN } as AuthenticatedUser;
  let activeUser = user;

  const mockJwtGuard: CanActivate = {
    canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
      req.user = activeUser;
      return true;
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    activeUser = user;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        Reflector,
        RolesGuard,
        { provide: NotificationsService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('delegates notification queries and read actions to service', async () => {
    expect((await controller.findMine(user, {})).meta.total).toBe(0);
    expect(await controller.getUnreadCount(user)).toEqual({ unreadCount: 2 });
    expect(await controller.markAllAsRead(user)).toEqual({ updated: 2 });
    expect((await controller.markAsRead(user, 'n-1')).isRead).toBe(true);
  });

  it('allows USER and blocks ADMIN from all /notifications endpoints with 403', async () => {
    const notifId = '11111111-1111-4111-8111-111111111111';

    activeUser = admin;
    await request(app.getHttpServer())
      .get('/notifications')
      .expect(HttpStatus.FORBIDDEN);
    await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .expect(HttpStatus.FORBIDDEN);
    await request(app.getHttpServer())
      .patch('/notifications/read-all')
      .expect(HttpStatus.FORBIDDEN);
    await request(app.getHttpServer())
      .patch(`/notifications/${notifId}/read`)
      .expect(HttpStatus.FORBIDDEN);

    activeUser = user;
    await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .expect(HttpStatus.OK);
  });
});
