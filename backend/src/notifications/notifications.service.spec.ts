import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service.js';
import { Notification } from './entities/notification.entity.js';
import { NotificationType } from './enums/notification-type.enum.js';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const mockRepo = {
    create: vi.fn((data) => data),
    save: vi.fn(async (data) =>
      Array.isArray(data) ? data : { id: 'n-1', ...data },
    ),
    findAndCount: vi.fn().mockResolvedValue([[{ id: 'n-1', title: 'Match' }], 1]),
    count: vi.fn().mockResolvedValue(3),
    findOne: vi.fn(),
    update: vi.fn().mockResolvedValue({ affected: 2 }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('creates notifications and returns paginated list for user', async () => {
    const created = await service.createNotification({
      userId: 'u-1',
      title: 'Match',
      message: 'Potential match',
      type: NotificationType.MATCH_FOUND,
    });
    expect(created.isRead).toBe(false);

    const list = await service.findForUser('u-1', { page: 1, limit: 10 });
    expect(list.meta.total).toBe(1);
    expect(await service.getUnreadCount('u-1')).toEqual({ unreadCount: 3 });
  });

  it('blocks marking another user notification as read', async () => {
    mockRepo.findOne.mockResolvedValue({
      id: 'n-1',
      userId: 'owner-1',
      isRead: false,
    });
    await expect(service.markAsRead('other-user', 'n-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws NotFoundException when notification does not exist', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.markAsRead('u-1', 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
