import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ItemsService } from './items.service.js';
import { Item } from './entities/item.entity.js';
import { ItemImage } from './entities/item-image.entity.js';
import { Category } from '../categories/entities/category.entity.js';
import { Location } from '../locations/entities/location.entity.js';
import { MatchingService } from '../matching/matching.service.js';
import { ReportType } from './enums/report-type.enum.js';
import { ItemStatus } from './enums/item-status.enum.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

describe('ItemsService', () => {
  let service: ItemsService;

  const sampleItem = {
    id: 'item-1',
    userId: 'owner-1',
    categoryId: 'cat-1',
    locationId: 'loc-1',
    title: 'Lost Passport',
    description: 'Nepali passport lost near New Baneshwor',
    reportType: ReportType.LOST,
    status: ItemStatus.OPEN,
    dateLostOrFound: new Date('2026-11-01T10:00:00Z'),
    contactInfo: '9800000000',
    user: { id: 'owner-1', fullName: 'Owner', isVerified: true, email: 'o@example.com' },
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockItemRepo = {
    findOne: vi.fn(),
    save: vi.fn(async (i) => i),
    create: vi.fn((d) => d),
    createQueryBuilder: vi.fn(),
    manager: {
      findOne: vi.fn().mockResolvedValue(null),
      transaction: vi.fn(),
    },
  };
  const mockItemImageRepo = {
    findOne: vi.fn(),
    create: vi.fn((d) => d),
    save: vi.fn(),
    remove: vi.fn(),
    manager: { transaction: vi.fn() },
  };
  const mockCategoryRepo = { findOne: vi.fn() };
  const mockLocationRepo = { findOne: vi.fn() };
  const mockMatchingService = {
    generateMatchesForItem: vi.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        { provide: getRepositoryToken(Item), useValue: mockItemRepo },
        { provide: getRepositoryToken(ItemImage), useValue: mockItemImageRepo },
        { provide: getRepositoryToken(Category), useValue: mockCategoryRepo },
        { provide: getRepositoryToken(Location), useValue: mockLocationRepo },
        { provide: MatchingService, useValue: mockMatchingService },
        {
          provide: ConfigService,
          useValue: { get: vi.fn().mockReturnValue('uploads') },
        },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
  });

  it('rejects create when category is inactive or missing', async () => {
    mockCategoryRepo.findOne.mockResolvedValue(null);

    await expect(
      service.create('owner-1', {
        title: 'Wallet',
        description: 'Black wallet lost in Thamel',
        reportType: ReportType.LOST,
        categoryId: 'cat-missing',
        locationId: 'loc-1',
        dateLostOrFound: '2026-11-01T10:00:00Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('redacts contactInfo and private reporter email for non-owners without approved claim', async () => {
    mockItemRepo.findOne.mockResolvedValue(sampleItem);
    mockItemRepo.manager.findOne.mockResolvedValue(null);

    const strangerView = await service.findOne('item-1', {
      id: 'stranger-1',
      role: UserRole.USER,
    } as AuthenticatedUser);

    expect(strangerView.canViewContact).toBe(false);
    expect(strangerView.contactInfo).toBeUndefined();
    expect((strangerView.reporter as { email?: string })?.email).toBeUndefined();

    const ownerView = await service.findOne('item-1', {
      id: 'owner-1',
      role: UserRole.USER,
    } as AuthenticatedUser);

    expect(ownerView.canViewContact).toBe(true);
    expect(ownerView.contactInfo).toBe('9800000000');
  });

  it('prevents non-owners from updating an item', async () => {
    mockItemRepo.findOne.mockResolvedValue(sampleItem);
    await expect(
      service.update(
        'item-1',
        { title: 'Hijacked Title' },
        { id: 'other-user', role: UserRole.USER } as AuthenticatedUser,
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
