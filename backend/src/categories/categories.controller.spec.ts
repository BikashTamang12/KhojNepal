import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  const mockService = {
    findAll: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue({ id: 'c-1', name: 'Electronics' }),
    create: vi.fn().mockResolvedValue({ id: 'c-2', name: 'Keys' }),
    update: vi.fn().mockResolvedValue({ id: 'c-1', name: 'Gadgets' }),
    deactivate: vi.fn().mockResolvedValue({ id: 'c-1', isActive: false }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: mockService }],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  it('delegates CRUD actions to CategoriesService', async () => {
    expect(await controller.findAll()).toEqual([]);
    expect((await controller.findOne('c-1')).name).toBe('Electronics');
    expect((await controller.create({ name: 'Keys' })).name).toBe('Keys');
    expect((await controller.update('c-1', { name: 'Gadgets' })).name).toBe('Gadgets');
    expect((await controller.deactivate('c-1')).isActive).toBe(false);
  });
});
