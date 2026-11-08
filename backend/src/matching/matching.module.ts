import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingController } from './matching.controller.js';
import { MatchingService } from './matching.service.js';
import { Match } from './entities/match.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Match])],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService, TypeOrmModule],
})
export class MatchingModule {}
