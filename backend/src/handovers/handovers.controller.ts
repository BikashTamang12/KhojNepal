import { Controller, Get } from '@nestjs/common';
import { HandoversService } from './handovers.service.js';
import { ItemHandover } from './entities/item-handover.entity.js';

@Controller('handovers')
export class HandoversController {
  constructor(private readonly handoversService: HandoversService) {}

  @Get()
  findAll(): Promise<ItemHandover[]> {
    return this.handoversService.findAll();
  }
}
