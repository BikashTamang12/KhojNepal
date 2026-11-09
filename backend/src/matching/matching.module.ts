import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingController } from './matching.controller.js';
import { MatchingService } from './matching.service.js';
import { Match } from './entities/match.entity.js';
import { Item } from '../items/entities/item.entity.js';
import { ItemImage } from '../items/entities/item-image.entity.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, Item, ItemImage]),
    NotificationsModule,
  ],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService, TypeOrmModule],
})
export class MatchingModule {}
