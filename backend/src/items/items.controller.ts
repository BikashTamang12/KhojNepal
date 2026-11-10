import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ItemsService } from './items.service.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { UpdateItemStatusDto } from './dto/update-item-status.dto.js';
import { QueryItemsDto } from './dto/query-items.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import {
  createItemImageMulterOptions,
  MAX_ITEM_IMAGES,
} from './utils/upload.config.js';

@Controller('items')
export class ItemsController {
  constructor(
    @Inject(ItemsService)
    private readonly itemsService: ItemsService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Query() query: QueryItemsDto,
    @CurrentUser() user?: AuthenticatedUser | null,
  ) {
    return this.itemsService.findAll(query, user);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  findMyItems(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryItemsDto,
  ) {
    return this.itemsService.findMyItems(user.id, query);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthenticatedUser | null,
  ) {
    return this.itemsService.findOne(id, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @UseInterceptors(
    FilesInterceptor('images', MAX_ITEM_IMAGES, createItemImageMulterOptions()),
  )
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateItemDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.itemsService.create(user.id, dto, files ?? []);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.itemsService.update(id, dto, user);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.itemsService.updateStatus(id, dto, user);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', MAX_ITEM_IMAGES, createItemImageMulterOptions()),
  )
  addImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.itemsService.addImages(id, files ?? [], user);
  }

  @Patch(':id/images/:imageId/primary')
  @UseGuards(JwtAuthGuard)
  setPrimaryImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.itemsService.setPrimaryImage(id, imageId, user);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard)
  removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.itemsService.removeImage(id, imageId, user);
  }
}
