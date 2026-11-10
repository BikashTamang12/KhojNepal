import {
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
import { MatchingService } from './matching.service.js';
import { MatchStatus } from './enums/match-status.enum.js';
import { QueryMatchesDto } from './dto/query-matches.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';

@Controller('matching')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MatchingController {
  constructor(
    @Inject(MatchingService)
    private readonly matchingService: MatchingService,
  ) {}

  @Get('my')
  @Roles(UserRole.USER)
  findMyMatches(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryMatchesDto,
  ) {
    return this.matchingService.findMyMatches(user.id, query);
  }

  @Get('item/:itemId')
  findForItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryMatchesDto,
  ) {
    return this.matchingService.findForItem(itemId, user, query);
  }

  @Post('item/:itemId/run')
  runMatching(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.matchingService.triggerForItem(itemId, user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.matchingService.findOne(id, user);
  }

  @Patch(':id/accept')
  @Roles(UserRole.USER)
  acceptMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.matchingService.updateStatus(id, MatchStatus.ACCEPTED, user);
  }

  @Patch(':id/reject')
  @Roles(UserRole.USER)
  rejectMatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.matchingService.updateStatus(id, MatchStatus.REJECTED, user);
  }
}
