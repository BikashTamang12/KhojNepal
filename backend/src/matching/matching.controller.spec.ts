import { Test, TestingModule } from '@nestjs/testing';
import { MatchingController } from './matching.controller.js';
import { MatchingService } from './matching.service.js';
import { MatchStatus } from './enums/match-status.enum.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';

describe('MatchingController', () => {
  let controller: MatchingController;
  const mockService = {
    findMyMatches: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 1 } }),
    findForItem: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 1 } }),
    triggerForItem: vi.fn().mockResolvedValue({ generatedCount: 1, matches: [] }),
    findOne: vi.fn().mockResolvedValue({ id: 'm-1' }),
    updateStatus: vi.fn().mockResolvedValue({ id: 'm-1', status: MatchStatus.ACCEPTED }),
  };
  const user = { id: 'u-1', role: UserRole.USER } as AuthenticatedUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchingController],
      providers: [{ provide: MatchingService, useValue: mockService }],
    }).compile();

    controller = module.get<MatchingController>(MatchingController);
  });

  it('handles match query, recompute, accept, and reject actions', async () => {
    expect((await controller.findMyMatches(user, {})).meta.total).toBe(0);
    expect((await controller.runMatching('i-1', user)).generatedCount).toBe(1);
    expect((await controller.acceptMatch('m-1', user)).status).toBe(
      MatchStatus.ACCEPTED,
    );
  });
});
