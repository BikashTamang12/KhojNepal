import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service.js';
import { Category } from './entities/category.entity.js';

describe('CategoriesService', () => {
  let service: CategoriesService;
  const mockRepo = {
    find: vi.fn().mockResolvedValue([{ id: 'c-1', name: 'Electronics', isActive: true }]),
    findOne: vi.fn(),
    create: vi.fn((dto) => dto),
    save: vi.fn(async (c) => ({ id: 'c-1', ...c })),
    createQueryBuilder: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('lists active categories by default', async () => {
    const res = await service.findAll();
    expect(res).toHaveLength(1);
    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  });

  it('throws ConflictException when creating duplicate category name', async () => {
    mockRepo.createQueryBuilder.mockReturnValue({
      where: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue({ id: 'c-1', name: 'Electronics' }),
    });

    await expect(service.create({ name: 'electronics' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('soft-deactivates a category cleanly', async () => {
    mockRepo.findOne.mockResolvedValue({ id: 'c-1', name: 'Bags', isActive: true });
    const res = await service.deactivate('c-1');
    expect(res.isActive).toBe(false);
  });

  it('throws NotFoundException on unknown category ID', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});
