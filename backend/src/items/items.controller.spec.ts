import { Test, TestingModule } from '@nestjs/testing';
import { ItemsController } from './items.controller.js';
import { ItemsService } from './items.service.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { ReportType } from './enums/report-type.enum.js';

describe('ItemsController', () => {
  let controller: ItemsController;
  const mockService = {
    findAll: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 1 } }),
    findMyItems: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 1 } }),
    findOne: vi.fn().mockResolvedValue({ id: 'item-1', title: 'Wallet' }),
    create: vi.fn().mockResolvedValue({ id: 'item-1', title: 'Wallet' }),
    update: vi.fn().mockResolvedValue({ id: 'item-1', title: 'Updated Wallet' }),
    updateStatus: vi.fn().mockResolvedValue({ id: 'item-1', status: 'CLOSED' }),
    addImages: vi.fn().mockResolvedValue({ id: 'item-1', images: [] }),
    setPrimaryImage: vi.fn().mockResolvedValue({ id: 'item-1' }),
    removeImage: vi.fn().mockResolvedValue({ id: 'item-1' }),
  };
  const user = { id: 'u-1', role: UserRole.USER } as AuthenticatedUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItemsController],
      providers: [{ provide: ItemsService, useValue: mockService }],
    }).compile();

    controller = module.get<ItemsController>(ItemsController);
  });

  it('delegates item routes cleanly', async () => {
    expect((await controller.findAll({}, null)).meta.total).toBe(0);
    expect((await controller.findMyItems(user, {})).meta.total).toBe(0);
    expect((await controller.findOne('item-1', null)).id).toBe('item-1');
    expect(
      (
        await controller.create(user, {
          title: 'Wallet',
          description: 'Lost wallet',
          reportType: ReportType.LOST,
          categoryId: 'c-1',
          locationId: 'l-1',
          dateLostOrFound: '2026-11-01T10:00:00Z',
        })
      ).id,
    ).toBe('item-1');
  });
});
