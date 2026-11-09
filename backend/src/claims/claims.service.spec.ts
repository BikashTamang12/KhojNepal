import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClaimsService } from './claims.service.js';
import { Claim } from './entities/claim.entity.js';
import { ClaimStatus } from './enums/claim-status.enum.js';
import { FinderClaimStatus } from './enums/finder-claim-status.enum.js';
import { Item } from '../items/entities/item.entity.js';
import { ItemStatus } from '../items/enums/item-status.enum.js';
import { NotificationsService } from '../notifications/notifications.service.js';

describe('ClaimsService', () => {
  let service: ClaimsService;

  const mockClaimRepo = {
    findOne: vi.fn(),
    create: vi.fn((d) => d),
    save: vi.fn(async (c) => ({ id: c.id ?? 'claim-1', ...c })),
    manager: {
      transaction: vi.fn(),
    },
  };
  const mockItemRepo = {
    findOne: vi.fn(),
  };
  const mockNotificationsService = {
    createNotification: vi.fn().mockResolvedValue({ id: 'n-1' }),
    createMany: vi.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaimsService,
        { provide: getRepositoryToken(Claim), useValue: mockClaimRepo },
        { provide: getRepositoryToken(Item), useValue: mockItemRepo },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ClaimsService>(ClaimsService);
  });

  it('prevents submitting a claim on your own reported item', async () => {
    mockItemRepo.findOne.mockResolvedValue({
      id: 'item-1',
      userId: 'user-1',
      status: ItemStatus.OPEN,
    });

    await expect(
      service.create('user-1', {
        itemId: 'item-1',
        explanation: 'This is definitely my item with initials inside',
        evidenceDescription: 'Receipt and serial number match',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('prevents duplicate pending claim from the same claimant', async () => {
    mockItemRepo.findOne.mockResolvedValue({
      id: 'item-1',
      userId: 'finder-1',
      status: ItemStatus.CLAIM_PENDING,
    });
    mockClaimRepo.findOne.mockResolvedValue({
      id: 'existing-claim',
      status: ClaimStatus.PENDING,
    });

    await expect(
      service.create('claimant-1', {
        itemId: 'item-1',
        explanation: 'Lost yesterday at Thamel entrance',
        evidenceDescription: 'Blue sticker under lid',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('blocks non-owners from performing finder review', async () => {
    mockClaimRepo.findOne.mockResolvedValue({
      id: 'claim-1',
      status: ClaimStatus.PENDING,
      item: { id: 'item-1', userId: 'finder-1', title: 'Wallet' },
    });

    await expect(
      service.finderReview('claim-1', 'stranger', {
        finderStatus: FinderClaimStatus.CONFIRMED,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
