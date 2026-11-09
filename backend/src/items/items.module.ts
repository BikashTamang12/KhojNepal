import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsController } from './items.controller.js';
import { ItemsService } from './items.service.js';
import { Item } from './entities/item.entity.js';
import { ItemImage } from './entities/item-image.entity.js';
import { Category } from '../categories/entities/category.entity.js';
import { Location } from '../locations/entities/location.entity.js';
import { MatchingModule } from '../matching/matching.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Item, ItemImage, Category, Location]),
    MatchingModule,
  ],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService, TypeOrmModule],
})
export class ItemsModule {}
