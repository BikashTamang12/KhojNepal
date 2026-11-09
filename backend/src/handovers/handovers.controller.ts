import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { HandoversService } from './handovers.service.js';
import { ItemHandover } from './entities/item-handover.entity.js';
import { CreateHandoverDto } from './dto/create-handover.dto.js';
import { UpdateHandoverActionDto } from './dto/update-handover-action.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator.js';

@Controller('handovers')
@UseGuards(JwtAuthGuard)
export class HandoversController {
  constructor(
    @Inject(HandoversService)
    private readonly handoversService: HandoversService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<ItemHandover[]> {
    return this.handoversService.findAllForUser(user);
  }

  @Get('my')
  findMine(@CurrentUser() user: AuthenticatedUser): Promise<ItemHandover[]> {
    return this.handoversService.findMine(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ItemHandover> {
    return this.handoversService.findOne(id, user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHandoverDto,
  ): Promise<ItemHandover> {
    return this.handoversService.create(user, dto);
  }

  @Patch(':id/confirm')
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateHandoverActionDto,
  ): Promise<ItemHandover> {
    return this.handoversService.confirm(id, user, dto);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateHandoverActionDto,
  ): Promise<ItemHandover> {
    return this.handoversService.cancel(id, user, dto);
  }
}
