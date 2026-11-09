import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClaimsService } from './claims.service.js';
import { CreateClaimDto } from './dto/create-claim.dto.js';
import { FinderReviewClaimDto } from './dto/finder-review-claim.dto.js';
import { AdminReviewClaimDto } from './dto/admin-review-claim.dto.js';
import { QueryClaimsDto } from './dto/query-claims.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';

@Controller('claims')
@UseGuards(JwtAuthGuard)
export class ClaimsController {
  constructor(
    @Inject(ClaimsService)
    private readonly claimsService: ClaimsService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateClaimDto,
  ) {
    return this.claimsService.create(user.id, dto);
  }

  @Get('my')
  findMyClaims(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryClaimsDto,
  ) {
    return this.claimsService.findMyClaims(user.id, query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.claimsService.findOne(id, user);
  }

  @Patch(':id/finder-review')
  finderReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: FinderReviewClaimDto,
  ) {
    return this.claimsService.finderReview(id, user.id, dto);
  }

  @Patch(':id/admin-review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: AdminReviewClaimDto,
  ) {
    return this.claimsService.adminReview(id, admin.id, dto);
  }
}
