import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemHandover } from './entities/item-handover.entity.js';
import { HandoversService } from './handovers.service.js';
import { HandoversController } from './handovers.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([ItemHandover])],
  controllers: [HandoversController],
  providers: [HandoversService],
  exports: [HandoversService, TypeOrmModule],
})
export class HandoversModule {}
