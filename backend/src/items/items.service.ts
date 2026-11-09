import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from './entities/item.entity.js';
import { ItemImage } from './entities/item-image.entity.js';
import { ItemStatus } from './enums/item-status.enum.js';
import { Category } from '../categories/entities/category.entity.js';
import { Location } from '../locations/entities/location.entity.js';
import { Claim } from '../claims/entities/claim.entity.js';
import { ClaimStatus } from '../claims/enums/claim-status.enum.js';
import { MatchingService } from '../matching/matching.service.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { UpdateItemStatusDto } from './dto/update-item-status.dto.js';
import { QueryItemsDto } from './dto/query-items.dto.js';
import {
  buildPaginatedResponse,
  type PaginatedResponse,
} from '../common/interfaces/paginated-result.interface.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { toPublicUserSummary } from '../common/utils/user-serializer.util.js';
import {
  MAX_ITEM_IMAGES,
  removeStoredImagePath,
  removeUploadedFiles,
} from './utils/upload.config.js';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(ItemImage)
    private readonly itemImageRepository: Repository<ItemImage>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @Inject(MatchingService)
    private readonly matchingService: MatchingService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  async create(
    userId: string,
    dto: CreateItemDto,
    files: Express.Multer.File[] = [],
  ) {
    try {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.categoryId, isActive: true },
      });
      if (!category) {
        throw new BadRequestException('Selected category does not exist or is inactive');
      }

      const location = await this.locationRepository.findOne({
        where: { id: dto.locationId },
      });
      if (!location) {
        throw new BadRequestException('Selected location does not exist');
      }

      const savedItem = await this.itemRepository.manager.transaction(
        async (manager) => {
          const itemRepo = manager.getRepository(Item);
          const imageRepo = manager.getRepository(ItemImage);

          const item = itemRepo.create({
            userId,
            categoryId: dto.categoryId,
            locationId: dto.locationId,
            title: dto.title.trim(),
            description: dto.description.trim(),
            brand: dto.brand?.trim() || undefined,
            color: dto.color?.trim() || undefined,
            reportType: dto.reportType,
            status: ItemStatus.OPEN,
            dateLostOrFound: new Date(dto.dateLostOrFound),
            specificLocationDetails:
              dto.specificLocationDetails?.trim() || undefined,
            contactInfo: dto.contactInfo?.trim() || undefined,
          });

          const created = await itemRepo.save(item);

          if (files.length > 0) {
            const images = files.map((file, index) =>
              imageRepo.create({
                itemId: created.id,
                filePath: `/uploads/items/${file.filename}`,
                originalFilename: file.originalname,
                mimeType: file.mimetype,
                fileSize: file.size,
                isPrimary: index === 0,
              }),
            );
            await imageRepo.save(images);
          }

          return created;
        },
      );

      try {
        await this.matchingService.generateMatchesForItem(savedItem.id);
      } catch {
        // Matching runs best-effort; do not fail item creation
      }

      return this.findOne(savedItem.id, {
        id: userId,
        role: UserRole.USER,
      } as AuthenticatedUser);
    } catch (error) {
      if (files.length > 0) {
        await removeUploadedFiles(files);
      }
      throw error;
    }
  }

  async findAll(
    query: QueryItemsDto,
    currentUser?: AuthenticatedUser | null,
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const qb = this.itemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('item.location', 'location')
      .leftJoinAndSelect('item.images', 'images')
      .leftJoinAndSelect('item.user', 'user');

    if (query.reportType) {
      qb.andWhere('item.reportType = :reportType', {
        reportType: query.reportType,
      });
    }

    if (query.status) {
      qb.andWhere('item.status = :status', { status: query.status });
    }

    if (query.categoryId) {
      qb.andWhere('item.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.locationId) {
      qb.andWhere('item.locationId = :locationId', {
        locationId: query.locationId,
      });
    }

    if (query.province?.trim()) {
      qb.andWhere('LOWER(location.province) = LOWER(:province)', {
        province: query.province.trim(),
      });
    }

    if (query.district?.trim()) {
      qb.andWhere('LOWER(location.district) = LOWER(:district)', {
        district: query.district.trim(),
      });
    }

    if (query.dateFrom) {
      qb.andWhere('item.dateLostOrFound >= :dateFrom', {
        dateFrom: new Date(query.dateFrom),
      });
    }

    if (query.dateTo) {
      qb.andWhere('item.dateLostOrFound <= :dateTo', {
        dateTo: new Date(query.dateTo),
      });
    }

    if (query.q?.trim()) {
      const pattern = `%${query.q.trim()}%`;
      qb.andWhere(
        `(
          item.title ILIKE :pattern
          OR item.description ILIKE :pattern
          OR COALESCE(item.brand, '') ILIKE :pattern
          OR COALESCE(item.color, '') ILIKE :pattern
          OR COALESCE(item.specificLocationDetails, '') ILIKE :pattern
          OR location.municipality ILIKE :pattern
          OR COALESCE(location.area, '') ILIKE :pattern
        )`,
        { pattern },
      );
    }

    if (query.sortBy === 'oldest') {
      qb.orderBy('item.createdAt', 'ASC');
    } else if (query.sortBy === 'dateLostOrFound') {
      qb.orderBy('item.dateLostOrFound', 'DESC');
    } else {
      qb.orderBy('item.createdAt', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    const formatted = items.map((item) =>
      this.formatItemResponse(
        item,
        Boolean(
          currentUser &&
            (currentUser.id === item.userId ||
              currentUser.role === UserRole.ADMIN),
        ),
      ),
    );

    return buildPaginatedResponse(formatted, total, page, limit);
  }

  async findMyItems(
    userId: string,
    query: QueryItemsDto,
  ): Promise<PaginatedResponse<Record<string, unknown>>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const qb = this.itemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('item.location', 'location')
      .leftJoinAndSelect('item.images', 'images')
      .leftJoinAndSelect('item.user', 'user')
      .where('item.userId = :userId', { userId });

    if (query.reportType) {
      qb.andWhere('item.reportType = :reportType', {
        reportType: query.reportType,
      });
    }

    if (query.status) {
      qb.andWhere('item.status = :status', { status: query.status });
    }

    qb.orderBy('item.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return buildPaginatedResponse(
      items.map((item) => this.formatItemResponse(item, true)),
      total,
      page,
      limit,
    );
  }

  async findOne(id: string, currentUser?: AuthenticatedUser | null) {
    const item = await this.itemRepository.findOne({
      where: { id },
      relations: {
        category: true,
        location: true,
        images: true,
        user: true,
      },
      order: {
        images: {
          isPrimary: 'DESC',
          createdAt: 'ASC',
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    let canViewContact = Boolean(
      currentUser &&
        (currentUser.id === item.userId || currentUser.role === UserRole.ADMIN),
    );

    if (!canViewContact && currentUser) {
      const approvedClaim = await this.itemRepository.manager.findOne(Claim, {
        where: {
          itemId: item.id,
          claimantId: currentUser.id,
          status: ClaimStatus.APPROVED,
        },
      });
      canViewContact = Boolean(approvedClaim);
    }

    return this.formatItemResponse(item, canViewContact);
  }

  async update(
    id: string,
    dto: UpdateItemDto,
    currentUser: AuthenticatedUser,
  ) {
    const item = await this.itemRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (item.userId !== currentUser.id && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only edit your own items');
    }

    if (
      (item.status === ItemStatus.RESOLVED || item.status === ItemStatus.CLOSED) &&
      currentUser.role !== UserRole.ADMIN
    ) {
      throw new BadRequestException('Resolved or closed items cannot be edited');
    }

    if (dto.categoryId && dto.categoryId !== item.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.categoryId, isActive: true },
      });
      if (!category) {
        throw new BadRequestException('Selected category does not exist or is inactive');
      }
      item.categoryId = dto.categoryId;
    }

    if (dto.locationId && dto.locationId !== item.locationId) {
      const location = await this.locationRepository.findOne({
        where: { id: dto.locationId },
      });
      if (!location) {
        throw new BadRequestException('Selected location does not exist');
      }
      item.locationId = dto.locationId;
    }

    if (dto.title !== undefined) item.title = dto.title.trim();
    if (dto.description !== undefined) item.description = dto.description.trim();
    if (dto.brand !== undefined) item.brand = dto.brand.trim() || undefined;
    if (dto.color !== undefined) item.color = dto.color.trim() || undefined;
    if (dto.dateLostOrFound !== undefined) {
      item.dateLostOrFound = new Date(dto.dateLostOrFound);
    }
    if (dto.specificLocationDetails !== undefined) {
      item.specificLocationDetails =
        dto.specificLocationDetails.trim() || undefined;
    }
    if (dto.contactInfo !== undefined) {
      item.contactInfo = dto.contactInfo.trim() || undefined;
    }

    await this.itemRepository.save(item);

    try {
      await this.matchingService.generateMatchesForItem(item.id);
    } catch {
      // Best-effort matching
    }

    return this.findOne(item.id, currentUser);
  }

  async updateStatus(
    id: string,
    dto: UpdateItemStatusDto,
    currentUser: AuthenticatedUser,
  ) {
    const item = await this.itemRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (item.userId !== currentUser.id && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the item owner or an admin can update item status');
    }

    item.status = dto.status;
    await this.itemRepository.save(item);
    return this.findOne(item.id, currentUser);
  }

  async addImages(
    id: string,
    files: Express.Multer.File[],
    currentUser: AuthenticatedUser,
  ) {
    try {
      if (!files || files.length === 0) {
        throw new BadRequestException('At least one image file is required');
      }

      const item = await this.itemRepository.findOne({
        where: { id },
        relations: { images: true },
      });

      if (!item) {
        throw new NotFoundException('Item not found');
      }

      if (item.userId !== currentUser.id && currentUser.role !== UserRole.ADMIN) {
        throw new ForbiddenException('You can only upload images to your own items');
      }

      const existingCount = item.images?.length ?? 0;
      if (existingCount + files.length > MAX_ITEM_IMAGES) {
        throw new BadRequestException(
          `Maximum ${MAX_ITEM_IMAGES} images allowed per item (currently ${existingCount})`,
        );
      }

      const hasPrimary = (item.images ?? []).some((img) => img.isPrimary);
      const createdImages = files.map((file, index) =>
        this.itemImageRepository.create({
          itemId: item.id,
          filePath: `/uploads/items/${file.filename}`,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          isPrimary: !hasPrimary && index === 0,
        }),
      );

      await this.itemImageRepository.save(createdImages);

      try {
        await this.matchingService.generateMatchesForItem(item.id);
      } catch {
        // Best-effort matching
      }

      return this.findOne(item.id, currentUser);
    } catch (error) {
      if (files && files.length > 0) {
        await removeUploadedFiles(files);
      }
      throw error;
    }
  }

  async setPrimaryImage(
    itemId: string,
    imageId: string,
    currentUser: AuthenticatedUser,
  ) {
    const item = await this.itemRepository.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (item.userId !== currentUser.id && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this item');
    }

    const image = await this.itemImageRepository.findOne({
      where: { id: imageId, itemId },
    });
    if (!image) {
      throw new NotFoundException('Image not found for this item');
    }

    await this.itemImageRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ItemImage);
      await repo.update({ itemId }, { isPrimary: false });
      await repo.update({ id: imageId }, { isPrimary: true });
    });

    return this.findOne(itemId, currentUser);
  }

  async removeImage(
    itemId: string,
    imageId: string,
    currentUser: AuthenticatedUser,
  ) {
    const item = await this.itemRepository.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (item.userId !== currentUser.id && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this image');
    }

    const image = await this.itemImageRepository.findOne({
      where: { id: imageId, itemId },
    });
    if (!image) {
      throw new NotFoundException('Image not found for this item');
    }

    const wasPrimary = image.isPrimary;
    const storedPath = image.filePath;
    await this.itemImageRepository.remove(image);

    const uploadDir = this.configService.get<string>('UPLOAD_DIR', 'uploads');
    await removeStoredImagePath(storedPath, uploadDir);

    if (wasPrimary) {
      const nextImage = await this.itemImageRepository.findOne({
        where: { itemId },
        order: { createdAt: 'ASC' },
      });
      if (nextImage) {
        nextImage.isPrimary = true;
        await this.itemImageRepository.save(nextImage);
      }
    }

    return this.findOne(itemId, currentUser);
  }

  private formatItemResponse(
    item: Item,
    canViewContact: boolean,
  ): Record<string, unknown> {
    return {
      id: item.id,
      userId: item.userId,
      categoryId: item.categoryId,
      locationId: item.locationId,
      title: item.title,
      description: item.description,
      brand: item.brand,
      color: item.color,
      reportType: item.reportType,
      status: item.status,
      dateLostOrFound: item.dateLostOrFound,
      specificLocationDetails: item.specificLocationDetails,
      contactInfo: canViewContact ? item.contactInfo : undefined,
      canViewContact,
      category: item.category,
      location: item.location,
      images: item.images ?? [],
      reporter: toPublicUserSummary(item.user),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
