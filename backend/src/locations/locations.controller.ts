import { Controller, Get } from '@nestjs/common';
import { LocationsService } from './locations.service.js';
import { Location } from './entities/location.entity.js';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  findAll(): Promise<Location[]> {
    return this.locationsService.findAll();
  }
}
