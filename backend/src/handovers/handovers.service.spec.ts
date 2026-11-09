import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HandoversService } from './handovers.service.js';
import { ItemHandover } from './entities/item-handover.entity.js';
import { HandoverConfirmationStatus } from './enums/handover-confirmation-status.enum.js';
import { Claim } from '../claims/entities/claim.entity.js';
import { ClaimStatus } from '../claims/enums/claim-status.enum.js';
import { ReportType } from '../items/enums/report-type.enum.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

describe('HandoversService', () => {
  let service: HandoversService;

  const mockHandoverRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn((d) => d),
    save: vi.fn(async (h) => ({ id: h.id ?? 'h-1', ...h })),
    manager: { transaction: vi.fn() },
  };
  const mockClaimRepo = { findOne: vi.fn() };
  const mockNotificationsService = {
    createMany: vi.fn().mockResolvedValue([]),
    createNotification: vi.fn().mockResolvedValue({ id: 'n-1' }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HandoversService,
        { provide: getRepositoryToken(ItemHandover), useValue: mockHandoverRepo },
        { provide: getRepositoryToken(Claim), useValue: mockClaimRepo },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<HandoversService>(HandoversService);
  });

  it('scopes findAllForUser to user handovers unless admin', async () => {
    mockHandoverRepo.find.mockResolvedValue([]);
    await service.findAllForUser({
      id: 'user-1',
      role: UserRole.USER,
    } as AuthenticatedUser);

    expect(mockHandoverRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [{ handedOverById: 'user-1' }, { receivedById: 'user-1' }],
      }),
    );
  });

  it('rejects creating handover for non-approved claims', async () => {
    mockClaimRepo.findOne.mockResolvedValue({
      id: 'claim-1',
      status: ClaimStatus.PENDING,
      claimantId: 'c-1',
      item: { userId: 'f-1', reportType: ReportType.FOUND },
    });

    await expect(
      service.create(
        { id: 'f-1', role: UserRole.USER } as AuthenticatedUser,
        { claimId: 'claim-1', handoverLocation: 'Ratnapark Police Desk' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects duplicate handover on same claim', async () => {
    mockClaimRepo.findOne.mockResolvedValue({
      id: 'claim-1',
      status: ClaimStatus.APPROVED,
      claimantId: 'c-1',
      handover: { id: 'h-existing' },
      item: { userId: 'f-1', reportType: ReportType.FOUND },
    });

    await expect(
      service.create(
        { id: 'f-1', role: UserRole.USER } as AuthenticatedUser,
        { claimId: 'claim-1', handoverLocation: 'Patan Durbar Square' },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('only allows receiving user or admin to confirm pending handover', async () => {
    mockHandoverRepo.findOne.mockResolvedValue({
      id: 'h-1',
      handedOverById: 'finder-1',
      receivedById: 'owner-1',
      confirmationStatus: HandoverConfirmationStatus.PENDING,
    });

    await expect(
      service.confirm(
        'h-1',
        { id: 'finder-1', role: UserRole.USER } as AuthenticatedUser,
        {},
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
