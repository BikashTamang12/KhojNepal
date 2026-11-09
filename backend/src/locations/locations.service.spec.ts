import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LocationsService } from './locations.service.js';
import { Location } from './entities/location.entity.js';

describe('LocationsService', () => {
  let service: LocationsService;
  const mockQb = {
    orderBy: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getMany: vi.fn().mockResolvedValue([{ id: 'loc-1', district: 'Kathmandu' }]),
  };
  const mockRepo = {
    createQueryBuilder: vi.fn().mockReturnValue(mockQb),
    findOne: vi.fn(),
    create: vi.fn((dto) => dto),
    save: vi.fn(async (loc) => ({ id: 'loc-1', ...loc })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: getRepositoryToken(Location), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
  });

  it('filters locations by province, district, and search term', async () => {
    const res = await service.findAll({ province: 'Bagmati', q: 'Thamel' });
    expect(res).toHaveLength(1);
    expect(mockQb.andWhere).toHaveBeenCalledTimes(2);
  });

  it('throws NotFoundException when location is missing', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});
