import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { Item } from '../items/entities/item.entity.js';
import { ReportType } from '../items/enums/report-type.enum.js';
import { ItemStatus } from '../items/enums/item-status.enum.js';
import { Claim } from '../claims/entities/claim.entity.js';
import { ClaimStatus } from '../claims/enums/claim-status.enum.js';
import { Match } from '../matching/entities/match.entity.js';
import { MatchStatus } from '../matching/enums/match-status.enum.js';
import { ItemHandover } from '../handovers/entities/item-handover.entity.js';
import { HandoverConfirmationStatus } from '../handovers/enums/handover-confirmation-status.enum.js';
import { Category } from '../categories/entities/category.entity.js';
import { Location } from '../locations/entities/location.entity.js';
import { ItemsService } from '../items/items.service.js';
import { ClaimsService } from '../claims/claims.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../notifications/enums/notification-type.enum.js';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { QueryItemsDto } from '../items/dto/query-items.dto.js';
import { UpdateItemStatusDto } from '../items/dto/update-item-status.dto.js';
import { QueryClaimsDto } from '../claims/dto/query-claims.dto.js';
import { AdminReviewClaimDto } from '../claims/dto/admin-review-claim.dto.js';
import { QueryMatchesDto } from '../matching/dto/query-matches.dto.js';
import { buildPaginatedResponse } from '../common/interfaces/paginated-result.interface.js';
import { sanitizeUser } from '../common/utils/user-serializer.util.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(Claim)
    private readonly claimRepository: Repository<Claim>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(ItemHandover)
    private readonly handoverRepository: Repository<ItemHandover>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @Inject(ItemsService)
    private readonly itemsService: ItemsService,
    @Inject(ClaimsService)
    private readonly claimsService: ClaimsService,
    @Inject(CategoriesService)
    private readonly categoriesService: CategoriesService,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  async getDashboard() {
    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      totalItems,
      lostItems,
      foundItems,
      openItems,
      claimPendingItems,
      resolvedItems,
      closedItems,
      totalClaims,
      pendingClaims,
      approvedClaims,
      rejectedClaims,
      totalMatches,
      pendingMatches,
      acceptedMatches,
      totalHandovers,
      confirmedHandovers,
      totalCategories,
      activeCategories,
      totalLocations,
      recentItems,
      pendingClaimQueue,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.userRepository.count({ where: { isVerified: true } }),
      this.itemRepository.count(),
      this.itemRepository.count({ where: { reportType: ReportType.LOST } }),
      this.itemRepository.count({ where: { reportType: ReportType.FOUND } }),
      this.itemRepository.count({ where: { status: ItemStatus.OPEN } }),
      this.itemRepository.count({ where: { status: ItemStatus.CLAIM_PENDING } }),
      this.itemRepository.count({ where: { status: ItemStatus.RESOLVED } }),
      this.itemRepository.count({ where: { status: ItemStatus.CLOSED } }),
      this.claimRepository.count(),
      this.claimRepository.count({ where: { status: ClaimStatus.PENDING } }),
      this.claimRepository.count({ where: { status: ClaimStatus.APPROVED } }),
      this.claimRepository.count({ where: { status: ClaimStatus.REJECTED } }),
      this.matchRepository.count(),
      this.matchRepository.count({ where: { status: MatchStatus.PENDING } }),
      this.matchRepository.count({ where: { status: MatchStatus.ACCEPTED } }),
      this.handoverRepository.count(),
      this.handoverRepository.count({
        where: { confirmationStatus: HandoverConfirmationStatus.CONFIRMED },
      }),
      this.categoryRepository.count(),
      this.categoryRepository.count({ where: { isActive: true } }),
      this.locationRepository.count(),
      this.itemRepository.find({
        relations: { category: true, location: true, images: true },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
      this.claimRepository.find({
        where: { status: ClaimStatus.PENDING },
        relations: { item: true, claimant: true },
        order: { createdAt: 'ASC' },
        take: 5,
      }),
    ]);

    return {
      summary: {
        users: {
          total: totalUsers,
          active: activeUsers,
          verified: verifiedUsers,
        },
        items: {
          total: totalItems,
          lost: lostItems,
          found: foundItems,
          open: openItems,
          claimPending: claimPendingItems,
          resolved: resolvedItems,
          closed: closedItems,
        },
        claims: {
          total: totalClaims,
          pending: pendingClaims,
          approved: approvedClaims,
          rejected: rejectedClaims,
        },
        matches: {
          total: totalMatches,
          pending: pendingMatches,
          accepted: acceptedMatches,
        },
        handovers: {
          total: totalHandovers,
          confirmed: confirmedHandovers,
        },
        taxonomy: {
          categoriesTotal: totalCategories,
          categoriesActive: activeCategories,
          locationsTotal: totalLocations,
        },
      },
      recentItems,
      pendingClaimQueue,
    };
  }

  async listUsers(query: QueryAdminUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC');

    if (query.q?.trim()) {
      const pattern = `%${query.q.trim()}%`;
      qb.andWhere(
        '(user.fullName ILIKE :pattern OR user.email ILIKE :pattern)',
        { pattern },
      );
    }

    if (query.role !== undefined) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.isVerified !== undefined) {
      qb.andWhere('user.isVerified = :isVerified', {
        isVerified: query.isVerified,
      });
    }

    qb.skip((page - 1) * limit).take(limit);

    const [users, total] = await qb.getManyAndCount();
    return buildPaginatedResponse(
      users.map((u) => sanitizeUser(u)),
      total,
      page,
      limit,
    );
  }

  async updateUserStatus(
    id: string,
    dto: UpdateUserStatusDto,
    adminId: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (id === adminId) {
      if (dto.isActive === false) {
        throw new BadRequestException('You cannot deactivate your own admin account');
      }
      if (dto.role === UserRole.USER) {
        throw new BadRequestException('You cannot demote your own admin role');
      }
    }

    const wasVerified = user.isVerified;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.isVerified !== undefined) user.isVerified = dto.isVerified;
    if (dto.role !== undefined) user.role = dto.role;

    const saved = await this.userRepository.save(user);

    if (!wasVerified && saved.isVerified) {
      await this.notificationsService.createNotification({
        userId: saved.id,
        title: 'Account Verified',
        message: 'Your KhojNepal account has been verified by an administrator.',
        type: NotificationType.SYSTEM,
      });
    }

    return sanitizeUser(saved);
  }

  listItems(query: QueryItemsDto, adminUser: AuthenticatedUser) {
    return this.itemsService.findAll(query, adminUser);
  }

  updateItemStatus(
    id: string,
    dto: UpdateItemStatusDto,
    adminUser: AuthenticatedUser,
  ) {
    return this.itemsService.updateStatus(id, dto, adminUser);
  }

  listClaims(query: QueryClaimsDto) {
    return this.claimsService.findAllAdmin(query);
  }

  reviewClaim(id: string, adminId: string, dto: AdminReviewClaimDto) {
    return this.claimsService.adminReview(id, adminId, dto);
  }

  async listMatches(query: QueryMatchesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const qb = this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.lostItem', 'lostItem')
      .leftJoinAndSelect('lostItem.category', 'lostCategory')
      .leftJoinAndSelect('lostItem.location', 'lostLocation')
      .leftJoinAndSelect('match.foundItem', 'foundItem')
      .leftJoinAndSelect('foundItem.category', 'foundCategory')
      .leftJoinAndSelect('foundItem.location', 'foundLocation');

    if (query.status) {
      qb.andWhere('match.status = :status', { status: query.status });
    }

    if (query.itemId) {
      qb.andWhere(
        '(match.lostItemId = :itemId OR match.foundItemId = :itemId)',
        { itemId: query.itemId },
      );
    }

    qb.orderBy('match.finalScore', 'DESC')
      .addOrderBy('match.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [matches, total] = await qb.getManyAndCount();
    return buildPaginatedResponse(matches, total, page, limit);
  }

  listCategories() {
    return this.categoriesService.findAll(true);
  }
}
