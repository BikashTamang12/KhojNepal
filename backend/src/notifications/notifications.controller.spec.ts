import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  const mockService = {
    findForUser: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 1 } }),
    getUnreadCount: vi.fn().mockResolvedValue({ unreadCount: 2 }),
    markAllAsRead: vi.fn().mockResolvedValue({ updated: 2 }),
    markAsRead: vi.fn().mockResolvedValue({ id: 'n-1', isRead: true }),
  };
  const user = { id: 'u-1', role: UserRole.USER } as AuthenticatedUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockService }],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('delegates notification queries and read actions to service', async () => {
    expect((await controller.findMine(user, {})).meta.total).toBe(0);
    expect(await controller.getUnreadCount(user)).toEqual({ unreadCount: 2 });
    expect(await controller.markAllAsRead(user)).toEqual({ updated: 2 });
    expect((await controller.markAsRead(user, 'n-1')).isRead).toBe(true);
  });
});
