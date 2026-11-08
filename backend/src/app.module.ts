import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { LocationsModule } from './locations/locations.module.js';
import { ItemsModule } from './items/items.module.js';
import { MatchingModule } from './matching/matching.module.js';
import { ClaimsModule } from './claims/claims.module.js';
import { HandoversModule } from './handovers/handovers.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { AdminModule } from './admin/admin.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE') || configService.get<string>('DB_NAME') || 'postgres',
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),

    AuthModule,
    UsersModule,
    CategoriesModule,
    LocationsModule,
    ItemsModule,
    MatchingModule,
    ClaimsModule,
    HandoversModule,
    NotificationsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
