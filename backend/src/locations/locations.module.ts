import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from './entities/location.entity.js';
import { LocationsService } from './locations.service.js';
import { LocationsController } from './locations.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Location])],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService, TypeOrmModule],
})
export class LocationsModule {}
