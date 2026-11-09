import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Not, Repository } from 'typeorm';
import { Claim } from './entities/claim.entity.js';
import { ClaimStatus } from './enums/claim-status.enum.js';
import { FinderClaimStatus } from './enums/finder-claim-status.enum.js';
import { Item } from '../items/entities/item.entity.js';
import { ItemStatus } from '../items/enums/item-status.enum.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../notifications/enums/notification-type.enum.js';
import { CreateClaimDto } from './dto/create-claim.dto.js';
import { FinderReviewClaimDto } from './dto/finder-review-claim.dto.js';
import { AdminReviewClaimDto } from './dto/admin-review-claim.dto.js';
import { QueryClaimsDto } from './dto/query-claims.dto.js';
import {
  buildPaginatedResponse,
  type PaginatedResponse,
} from '../common/interfaces/paginated-result.interface.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { toPublicUserSummary } from '../common/utils/user-serializer.util.js';

@Injectable()
export class ClaimsService {
  constructor(
    @InjectRepository(Claim)
    private readonly claimRepository: Repository<Claim>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateClaimDto): Promise<Claim> {
    const item = await this.itemRepository.findOne({
      where: { id: dto.itemId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (
      item.status !== ItemStatus.OPEN &&
      item.status !== ItemStatus.CLAIM_PENDING
    ) {
      throw new BadRequestException(
        'Claims can only be submitted for open or pending items',
      );
    }

    if (item.userId === userId) {
      throw new BadRequestException('You cannot submit a claim on your own report');
    }

    const existingPending = await this.claimRepository.findOne({
      where: {
        itemId: dto.itemId,
        claimantId: userId,
        status: ClaimStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new ConflictException(
        'You already have a pending claim for this item',
      );
    }

    const savedClaim = await this.claimRepository.manager.transaction(
      async (manager) => {
        const claimRepo = manager.getRepository(Claim);
        const itemRepo = manager.getRepository(Item);

        const claim = claimRepo.create({
          itemId: dto.itemId,
          claimantId: userId,
          explanation: dto.explanation.trim(),
          evidenceDescription: dto.evidenceDescription.trim(),
          finderStatus: FinderClaimStatus.PENDING,
          status: ClaimStatus.PENDING,
        });

        const created = await claimRepo.save(claim);

        if (item.status === ItemStatus.OPEN) {
          item.status = ItemStatus.CLAIM_PENDING;
          await itemRepo.save(item);
        }

        await this.notificationsService.createNotification(
          {
            userId: item.userId,
            title: 'New Claim Received',
            message: `Someone submitted a claim for "${item.title}". Please review the evidence.`,
            type: NotificationType.CLAIM_UPDATE,
            metadata: {
              claimId: created.id,
              itemId: item.id,
            },
          },
          manager,
        );

        return created;
      },
    );

    return this.findOne(savedClaim.id, {
      id: userId,
      role: UserRole.USER,
    } as AuthenticatedUser);
  }

  async findMyClaims(
    userId: string,
    query: QueryClaimsDto,
  ): Promise<PaginatedResponse<Claim>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const qb = this.claimRepository
      .createQueryBuilder('claim')
      .leftJoinAndSelect('claim.item', 'item')
      .leftJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('item.location', 'location')
      .leftJoinAndSelect('item.images', 'images')
      .leftJoinAndSelect('claim.claimant', 'claimant')
      .leftJoinAndSelect('claim.handover', 'handover');

    if (query.role === 'submitted') {
      qb.where('claim.claimantId = :userId', { userId });
    } else if (query.role === 'received') {
      qb.where('item.userId = :userId', { userId });
    } else {
      qb.where(
        new Brackets((scope) => {
          scope
            .where('claim.claimantId = :userId', { userId })
            .orWhere('item.userId = :userId', { userId });
        }),
      );
    }

    if (query.status) {
      qb.andWhere('claim.status = :status', { status: query.status });
    }

    if (query.finderStatus) {
      qb.andWhere('claim.finderStatus = :finderStatus', {
        finderStatus: query.finderStatus,
      });
    }

    if (query.itemId) {
      qb.andWhere('claim.itemId = :itemId', { itemId: query.itemId });
    }

    qb.orderBy('claim.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [claims, total] = await qb.getManyAndCount();
    const sanitized = claims.map((c) => this.redactClaimUsers(c, userId, false));
    return buildPaginatedResponse(sanitized, total, page, limit);
  }

  async findAllAdmin(query: QueryClaimsDto): Promise<PaginatedResponse<Claim>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const qb = this.claimRepository
      .createQueryBuilder('claim')
      .leftJoinAndSelect('claim.item', 'item')
      .leftJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('item.location', 'location')
      .leftJoinAndSelect('item.user', 'itemOwner')
      .leftJoinAndSelect('claim.claimant', 'claimant')
      .leftJoinAndSelect('claim.reviewedBy', 'reviewedBy')
      .leftJoinAndSelect('claim.handover', 'handover');

    if (query.status) {
      qb.andWhere('claim.status = :status', { status: query.status });
    }

    if (query.finderStatus) {
      qb.andWhere('claim.finderStatus = :finderStatus', {
        finderStatus: query.finderStatus,
      });
    }

    if (query.itemId) {
      qb.andWhere('claim.itemId = :itemId', { itemId: query.itemId });
    }

    qb.orderBy('claim.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [claims, total] = await qb.getManyAndCount();
    return buildPaginatedResponse(claims, total, page, limit);
  }

  async findOne(id: string, currentUser: AuthenticatedUser): Promise<Claim> {
    const claim = await this.claimRepository.findOne({
      where: { id },
      relations: {
        item: {
          category: true,
          location: true,
          images: true,
          user: true,
        },
        claimant: true,
        reviewedBy: true,
        handover: true,
      },
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    const isAdmin = currentUser.role === UserRole.ADMIN;
    const isParticipant =
      claim.claimantId === currentUser.id ||
      claim.item?.userId === currentUser.id;

    if (!isAdmin && !isParticipant) {
      throw new ForbiddenException('You do not have access to this claim');
    }

    return this.redactClaimUsers(claim, currentUser.id, isAdmin);
  }

  async finderReview(
    id: string,
    userId: string,
    dto: FinderReviewClaimDto,
  ): Promise<Claim> {
    const claim = await this.claimRepository.findOne({
      where: { id },
      relations: { item: true },
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (claim.item.userId !== userId) {
      throw new ForbiddenException(
        'Only the user who reported this item can submit a finder review',
      );
    }

    if (claim.status !== ClaimStatus.PENDING) {
      throw new BadRequestException('This claim has already been finalized');
    }

    claim.finderStatus = dto.finderStatus;
    claim.finderReviewedAt = new Date();
    claim.finderNotes = dto.finderNotes?.trim() || undefined;

    await this.claimRepository.save(claim);

    await this.notificationsService.createNotification({
      userId: claim.claimantId,
      title:
        dto.finderStatus === FinderClaimStatus.CONFIRMED
          ? 'Reporter Confirmed Your Claim'
          : 'Reporter Disputed Your Claim',
      message:
        dto.finderStatus === FinderClaimStatus.CONFIRMED
          ? `The reporter reviewed your claim for "${claim.item.title}" as confirmed. Awaiting admin verification.`
          : `The reporter disputed your claim for "${claim.item.title}". An admin will review the details.`,
      type: NotificationType.CLAIM_UPDATE,
      metadata: {
        claimId: claim.id,
        itemId: claim.itemId,
        finderStatus: claim.finderStatus,
      },
    });

    return this.findOne(claim.id, {
      id: userId,
      role: UserRole.USER,
    } as AuthenticatedUser);
  }

  async adminReview(
    id: string,
    adminId: string,
    dto: AdminReviewClaimDto,
  ): Promise<Claim> {
    const claim = await this.claimRepository.findOne({
      where: { id },
      relations: { item: true },
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (claim.status !== ClaimStatus.PENDING) {
      throw new BadRequestException('Claim has already been reviewed');
    }

    await this.claimRepository.manager.transaction(async (manager) => {
      const claimRepo = manager.getRepository(Claim);
      const itemRepo = manager.getRepository(Item);

      claim.status = dto.status;
      claim.reviewedById = adminId;
      claim.reviewedAt = new Date();
      claim.adminNotes = dto.adminNotes?.trim() || undefined;
      await claimRepo.save(claim);

      if (dto.status === ClaimStatus.APPROVED) {
        const competingClaims = await claimRepo.find({
          where: {
            itemId: claim.itemId,
            status: ClaimStatus.PENDING,
            id: Not(claim.id),
          },
        });

        for (const competing of competingClaims) {
          competing.status = ClaimStatus.REJECTED;
          competing.reviewedById = adminId;
          competing.reviewedAt = new Date();
          competing.adminNotes =
            'Rejected automatically because another claim for this item was approved.';
          await claimRepo.save(competing);

          await this.notificationsService.createNotification(
            {
              userId: competing.claimantId,
              title: 'Claim Not Approved',
              message: `Another claim for "${claim.item.title}" was approved by an administrator.`,
              type: NotificationType.CLAIM_UPDATE,
              metadata: {
                claimId: competing.id,
                itemId: claim.itemId,
                status: ClaimStatus.REJECTED,
              },
            },
            manager,
          );
        }

        if (claim.item.status === ItemStatus.OPEN) {
          claim.item.status = ItemStatus.CLAIM_PENDING;
          await itemRepo.save(claim.item);
        }

        await this.notificationsService.createMany(
          [
            {
              userId: claim.claimantId,
              title: 'Claim Approved',
              message: `Your claim for "${claim.item.title}" has been approved! Coordinate handover with the reporter.`,
              type: NotificationType.CLAIM_UPDATE,
              metadata: {
                claimId: claim.id,
                itemId: claim.itemId,
                status: ClaimStatus.APPROVED,
              },
            },
            {
              userId: claim.item.userId,
              title: 'Approved Claim Ready for Handover',
              message: `An administrator approved a claim for "${claim.item.title}". You can now schedule the item handover.`,
              type: NotificationType.CLAIM_UPDATE,
              metadata: {
                claimId: claim.id,
                itemId: claim.itemId,
                status: ClaimStatus.APPROVED,
              },
            },
          ],
          manager,
        );
      } else {
        const activeClaimCount = await claimRepo
          .createQueryBuilder('c')
          .where('c.itemId = :itemId', { itemId: claim.itemId })
          .andWhere('c.id != :id', { id: claim.id })
          .andWhere('c.status IN (:...statuses)', {
            statuses: [ClaimStatus.PENDING, ClaimStatus.APPROVED],
          })
          .getCount();

        if (
          activeClaimCount === 0 &&
          claim.item.status === ItemStatus.CLAIM_PENDING
        ) {
          claim.item.status = ItemStatus.OPEN;
          await itemRepo.save(claim.item);
        }

        await this.notificationsService.createNotification(
          {
            userId: claim.claimantId,
            title: 'Claim Rejected',
            message: `Your claim for "${claim.item.title}" was rejected by an administrator.`,
            type: NotificationType.CLAIM_UPDATE,
            metadata: {
              claimId: claim.id,
              itemId: claim.itemId,
              status: ClaimStatus.REJECTED,
            },
          },
          manager,
        );
      }
    });

    return this.findOne(claim.id, {
      id: adminId,
      role: UserRole.ADMIN,
    } as AuthenticatedUser);
  }

  private redactClaimUsers(
    claim: Claim,
    currentUserId: string,
    isAdmin: boolean,
  ): Claim {
    if (isAdmin) return claim;

    const isApproved = claim.status === ClaimStatus.APPROVED;
    if (
      claim.claimant &&
      claim.claimantId !== currentUserId &&
      !isApproved
    ) {
      (claim as unknown as { claimant?: unknown }).claimant =
        toPublicUserSummary(claim.claimant);
    }

    if (
      claim.item?.user &&
      claim.item.userId !== currentUserId &&
      !isApproved
    ) {
      (claim.item as unknown as { user?: unknown }).user = toPublicUserSummary(
        claim.item.user,
      );
      claim.item.contactInfo = undefined;
    }

    return claim;
  }
}
