import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsController } from './items.controller.js';
import { ItemsService } from './items.service.js';
import { Item } from './entities/item.entity.js';
import { ItemImage } from './entities/item-image.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Item, ItemImage])],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService, TypeOrmModule],
})
export class ItemsModule {}
