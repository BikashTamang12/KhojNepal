import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { QueryItemsDto } from '../items/dto/query-items.dto.js';
import { UpdateItemStatusDto } from '../items/dto/update-item-status.dto.js';
import { QueryClaimsDto } from '../claims/dto/query-claims.dto.js';
import { AdminReviewClaimDto } from '../claims/dto/admin-review-claim.dto.js';
import { QueryMatchesDto } from '../matching/dto/query-matches.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    @Inject(AdminService)
    private readonly adminService: AdminService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  listUsers(@Query() query: QueryAdminUsersDto) {
    return this.adminService.listUsers(query);
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.adminService.updateUserStatus(id, dto, admin.id);
  }

  @Get('items')
  listItems(
    @Query() query: QueryItemsDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.adminService.listItems(query, admin);
  }

  @Patch('items/:id/status')
  updateItemStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemStatusDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.adminService.updateItemStatus(id, dto, admin);
  }

  @Get('claims')
  listClaims(@Query() query: QueryClaimsDto) {
    return this.adminService.listClaims(query);
  }

  @Patch('claims/:id/review')
  reviewClaim(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: AdminReviewClaimDto,
  ) {
    return this.adminService.reviewClaim(id, admin.id, dto);
  }

  @Get('matches')
  listMatches(@Query() query: QueryMatchesDto) {
    return this.adminService.listMatches(query);
  }

  @Get('categories')
  listCategories() {
    return this.adminService.listCategories();
  }
}
