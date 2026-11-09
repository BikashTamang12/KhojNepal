import { Test, TestingModule } from '@nestjs/testing';
import { LocationsController } from './locations.controller.js';
import { LocationsService } from './locations.service.js';

describe('LocationsController', () => {
  let controller: LocationsController;
  const mockService = {
    findAll: vi.fn().mockResolvedValue([{ id: 'l-1', district: 'Kathmandu' }]),
    findOne: vi.fn().mockResolvedValue({ id: 'l-1', district: 'Kathmandu' }),
    create: vi.fn().mockResolvedValue({ id: 'l-2', district: 'Kaski' }),
    update: vi.fn().mockResolvedValue({ id: 'l-1', area: 'Thamel' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [{ provide: LocationsService, useValue: mockService }],
    }).compile();

    controller = module.get<LocationsController>(LocationsController);
  });

  it('handles list, get, create, and update cleanly', async () => {
    expect(await controller.findAll({})).toHaveLength(1);
    expect((await controller.findOne('l-1')).district).toBe('Kathmandu');
    expect(
      (
        await controller.create({
          province: 'Gandaki',
          district: 'Kaski',
          municipality: 'Pokhara',
        })
      ).district,
    ).toBe('Kaski');
    expect((await controller.update('l-1', { area: 'Thamel' })).area).toBe('Thamel');
  });
});
