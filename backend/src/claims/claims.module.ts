import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaimsController } from './claims.controller.js';
import { ClaimsService } from './claims.service.js';
import { Claim } from './entities/claim.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Claim])],
  controllers: [ClaimsController],
  providers: [ClaimsService],
  exports: [ClaimsService, TypeOrmModule],
})
export class ClaimsModule {}
