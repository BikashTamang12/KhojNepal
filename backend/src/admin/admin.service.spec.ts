import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from './admin.service.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { Item } from '../items/entities/item.entity.js';
import { Claim } from '../claims/entities/claim.entity.js';
import { Match } from '../matching/entities/match.entity.js';
import { ItemHandover } from '../handovers/entities/item-handover.entity.js';
import { Category } from '../categories/entities/category.entity.js';
import { Location } from '../locations/entities/location.entity.js';
import { ItemsService } from '../items/items.service.js';
import { ClaimsService } from '../claims/claims.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

describe('AdminService', () => {
  let service: AdminService;

  const mockUserRepo = {
    count: vi.fn().mockResolvedValue(5),
    findOne: vi.fn(),
    save: vi.fn(async (u) => u),
    createQueryBuilder: vi.fn(),
  };
  const emptyRepo = {
    count: vi.fn().mockResolvedValue(2),
    find: vi.fn().mockResolvedValue([]),
    createQueryBuilder: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Item), useValue: emptyRepo },
        { provide: getRepositoryToken(Claim), useValue: emptyRepo },
        { provide: getRepositoryToken(Match), useValue: emptyRepo },
        { provide: getRepositoryToken(ItemHandover), useValue: emptyRepo },
        { provide: getRepositoryToken(Category), useValue: emptyRepo },
        { provide: getRepositoryToken(Location), useValue: emptyRepo },
        { provide: ItemsService, useValue: { findAll: vi.fn(), updateStatus: vi.fn() } },
        { provide: ClaimsService, useValue: { findAllAdmin: vi.fn(), adminReview: vi.fn() } },
        { provide: CategoriesService, useValue: { findAll: vi.fn().mockResolvedValue([]) } },
        { provide: NotificationsService, useValue: { createNotification: vi.fn() } },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('aggregates dashboard metrics across all modules', async () => {
    const dashboard = await service.getDashboard();
    expect(dashboard.summary.users.total).toBe(5);
    expect(dashboard.summary.items.total).toBe(2);
    expect(dashboard.recentItems).toEqual([]);
    expect(dashboard.pendingClaimQueue).toEqual([]);
  });

  it('prevents an admin from deactivating or demoting themselves', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@gmail.com',
      role: UserRole.ADMIN,
      isActive: true,
      isVerified: true,
    });

    await expect(
      service.updateUserStatus('admin-1', { isActive: false }, 'admin-1'),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.updateUserStatus('admin-1', { role: UserRole.USER }, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });
});
