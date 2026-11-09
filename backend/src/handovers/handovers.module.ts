import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemHandover } from './entities/item-handover.entity.js';
import { Claim } from '../claims/entities/claim.entity.js';
import { HandoversService } from './handovers.service.js';
import { HandoversController } from './handovers.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([ItemHandover, Claim]), NotificationsModule],
  controllers: [HandoversController],
  providers: [HandoversService],
  exports: [HandoversService, TypeOrmModule],
})
export class HandoversModule {}
