import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MatchingService } from './matching.service.js';
import { Match } from './entities/match.entity.js';
import { MatchStatus } from './enums/match-status.enum.js';
import { Item } from '../items/entities/item.entity.js';
import { ReportType } from '../items/enums/report-type.enum.js';
import { ItemStatus } from '../items/enums/item-status.enum.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

describe('MatchingService', () => {
  let service: MatchingService;

  const mockMatchRepo = {
    findOne: vi.fn(),
    create: vi.fn((d) => d),
    save: vi.fn(async (m) => ({ id: m.id ?? 'match-1', ...m })),
    createQueryBuilder: vi.fn(),
  };
  const mockItemRepo = {
    findOne: vi.fn(),
    find: vi.fn(),
  };
  const mockNotificationsService = {
    createMany: vi.fn().mockResolvedValue([]),
    createNotification: vi.fn().mockResolvedValue({ id: 'n-1' }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: getRepositoryToken(Match), useValue: mockMatchRepo },
        { provide: getRepositoryToken(Item), useValue: mockItemRepo },
        { provide: NotificationsService, useValue: mockNotificationsService },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string, fallback: unknown) =>
              key === 'MATCH_THRESHOLD' ? 0.35 : fallback,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
  });

  it('persists qualifying opposite-type matches and notifies both owners', async () => {
    const lost = {
      id: 'item-lost',
      userId: 'user-lost',
      categoryId: 'cat-1',
      locationId: 'loc-1',
      title: 'Black Leather Wallet',
      description: 'Lost black leather wallet in Thamel Kathmandu',
      brand: 'Wildcraft',
      color: 'Black',
      reportType: ReportType.LOST,
      status: ItemStatus.OPEN,
      dateLostOrFound: new Date('2026-11-01T09:00:00Z'),
      images: [],
    };

    const found = {
      id: 'item-found',
      userId: 'user-found',
      categoryId: 'cat-1',
      locationId: 'loc-1',
      title: 'Black Wallet',
      description: 'Found black leather wallet near Thamel',
      brand: 'Wildcraft',
      color: 'Black',
      reportType: ReportType.FOUND,
      status: ItemStatus.OPEN,
      dateLostOrFound: new Date('2026-11-01T14:00:00Z'),
      images: [],
    };

    mockItemRepo.findOne.mockResolvedValue(lost);
    mockItemRepo.find.mockResolvedValue([found]);
    mockMatchRepo.findOne.mockResolvedValue(null);

    const matches = await service.generateMatchesForItem('item-lost');

    expect(matches).toHaveLength(1);
    expect(matches[0].finalScore).toBeGreaterThan(0.7);
    expect(mockNotificationsService.createMany).toHaveBeenCalledTimes(1);
  });

  it('blocks non-participants from accepting a match', async () => {
    mockMatchRepo.findOne.mockResolvedValue({
      id: 'match-1',
      status: MatchStatus.PENDING,
      lostItem: { id: 'l-1', userId: 'u-1', title: 'Lost' },
      foundItem: { id: 'f-1', userId: 'u-2', title: 'Found' },
    });

    await expect(
      service.updateStatus('match-1', MatchStatus.ACCEPTED, {
        id: 'stranger',
        role: UserRole.USER,
      } as AuthenticatedUser),
    ).rejects.toThrow(ForbiddenException);
  });
});
