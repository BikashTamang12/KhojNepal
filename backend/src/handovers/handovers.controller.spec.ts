import { Test, TestingModule } from '@nestjs/testing';
import { HandoversController } from './handovers.controller.js';
import { HandoversService } from './handovers.service.js';
import { HandoverConfirmationStatus } from './enums/handover-confirmation-status.enum.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

describe('HandoversController', () => {
  let controller: HandoversController;
  const mockService = {
    findAllForUser: vi.fn().mockResolvedValue([]),
    findMine: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue({ id: 'h-1' }),
    create: vi.fn().mockResolvedValue({ id: 'h-1', confirmationStatus: HandoverConfirmationStatus.PENDING }),
    confirm: vi.fn().mockResolvedValue({ id: 'h-1', confirmationStatus: HandoverConfirmationStatus.CONFIRMED }),
    cancel: vi.fn().mockResolvedValue({ id: 'h-1', confirmationStatus: HandoverConfirmationStatus.CANCELLED }),
  };
  const user = { id: 'u-1', role: UserRole.USER } as AuthenticatedUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HandoversController],
      providers: [{ provide: HandoversService, useValue: mockService }],
    }).compile();

    controller = module.get<HandoversController>(HandoversController);
  });

  it('delegates handover endpoints cleanly', async () => {
    expect(await controller.findAll(user)).toEqual([]);
    expect((await controller.create(user, { claimId: 'c-1', handoverLocation: 'Thamel' })).id).toBe('h-1');
    expect((await controller.confirm('h-1', user, {})).confirmationStatus).toBe(
      HandoverConfirmationStatus.CONFIRMED,
    );
    expect((await controller.cancel('h-1', user, {})).confirmationStatus).toBe(
      HandoverConfirmationStatus.CANCELLED,
    );
  });
});
