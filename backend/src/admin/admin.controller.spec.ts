import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { ClaimStatus } from '../claims/enums/claim-status.enum.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

describe('AdminController', () => {
  let controller: AdminController;
  const mockService = {
    getDashboard: vi.fn().mockResolvedValue({ summary: {} }),
    listUsers: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 1 } }),
    updateUserStatus: vi.fn().mockResolvedValue({ id: 'u-1', isVerified: true }),
    listItems: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 1 } }),
    updateItemStatus: vi.fn().mockResolvedValue({ id: 'i-1' }),
    listClaims: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 1 } }),
    reviewClaim: vi.fn().mockResolvedValue({ id: 'c-1', status: ClaimStatus.APPROVED }),
    listMatches: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 1 } }),
    listCategories: vi.fn().mockResolvedValue([]),
  };
  const admin = { id: 'admin-1', role: UserRole.ADMIN } as AuthenticatedUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockService }],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('delegates admin dashboard and moderation actions cleanly', async () => {
    expect(await controller.getDashboard()).toEqual({ summary: {} });
    expect((await controller.updateUserStatus('u-1', { isVerified: true }, admin)).isVerified).toBe(true);
    expect(
      (
        await controller.reviewClaim('c-1', admin, {
          status: ClaimStatus.APPROVED,
        })
      ).status,
    ).toBe(ClaimStatus.APPROVED);
  });
});
