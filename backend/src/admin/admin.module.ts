import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { User } from '../users/entities/user.entity.js';
import { Item } from '../items/entities/item.entity.js';
import { Claim } from '../claims/entities/claim.entity.js';
import { Match } from '../matching/entities/match.entity.js';
import { ItemHandover } from '../handovers/entities/item-handover.entity.js';
import { Category } from '../categories/entities/category.entity.js';
import { Location } from '../locations/entities/location.entity.js';
import { ItemsModule } from '../items/items.module.js';
import { ClaimsModule } from '../claims/claims.module.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Item,
      Claim,
      Match,
      ItemHandover,
      Category,
      Location,
    ]),
    ItemsModule,
    ClaimsModule,
    CategoriesModule,
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
