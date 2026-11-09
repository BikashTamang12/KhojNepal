import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemHandover } from './entities/item-handover.entity.js';
import { HandoverConfirmationStatus } from './enums/handover-confirmation-status.enum.js';
import { Claim } from '../claims/entities/claim.entity.js';
import { ClaimStatus } from '../claims/enums/claim-status.enum.js';
import { Item } from '../items/entities/item.entity.js';
import { ItemStatus } from '../items/enums/item-status.enum.js';
import { ReportType } from '../items/enums/report-type.enum.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../notifications/enums/notification-type.enum.js';
import { CreateHandoverDto } from './dto/create-handover.dto.js';
import { UpdateHandoverActionDto } from './dto/update-handover-action.dto.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';

@Injectable()
export class HandoversService {
  constructor(
    @InjectRepository(ItemHandover)
    private readonly handoverRepository: Repository<ItemHandover>,
    @InjectRepository(Claim)
    private readonly claimRepository: Repository<Claim>,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  findAllForUser(currentUser: AuthenticatedUser): Promise<ItemHandover[]> {
    if (currentUser.role === UserRole.ADMIN) {
      return this.handoverRepository.find({
        relations: {
          claim: {
            item: true,
          },
          handedOverBy: true,
          receivedBy: true,
        },
        order: { createdAt: 'DESC' },
      });
    }

    return this.findMine(currentUser.id);
  }

  findMine(userId: string): Promise<ItemHandover[]> {
    return this.handoverRepository.find({
      where: [{ handedOverById: userId }, { receivedById: userId }],
      relations: {
        claim: {
          item: true,
        },
        handedOverBy: true,
        receivedBy: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<ItemHandover> {
    const handover = await this.handoverRepository.findOne({
      where: { id },
      relations: {
        claim: {
          item: true,
        },
        handedOverBy: true,
        receivedBy: true,
      },
    });

    if (!handover) {
      throw new NotFoundException('Handover record not found');
    }

    const isParticipant =
      handover.handedOverById === currentUser.id ||
      handover.receivedById === currentUser.id;
    if (!isParticipant && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have access to this handover');
    }

    return handover;
  }

  async create(
    currentUser: AuthenticatedUser,
    dto: CreateHandoverDto,
  ): Promise<ItemHandover> {
    const claim = await this.claimRepository.findOne({
      where: { id: dto.claimId },
      relations: {
        item: true,
        handover: true,
      },
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (claim.status !== ClaimStatus.APPROVED) {
      throw new BadRequestException(
        'Handover can only be created for an approved claim',
      );
    }

    if (claim.handover) {
      throw new ConflictException('A handover already exists for this claim');
    }

    const isParticipant =
      claim.item.userId === currentUser.id ||
      claim.claimantId === currentUser.id;
    if (!isParticipant && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only claim participants or an admin can schedule handover',
      );
    }

    // Found reports are handed over by the reporter (finder) to the claimant (owner);
    // Lost reports claimed by a finder are handed over by the claimant (finder) to the reporter (owner).
    const handedOverById =
      claim.item.reportType === ReportType.FOUND
        ? claim.item.userId
        : claim.claimantId;
    const receivedById =
      claim.item.reportType === ReportType.FOUND
        ? claim.claimantId
        : claim.item.userId;

    const handover = this.handoverRepository.create({
      claimId: claim.id,
      handedOverById,
      receivedById,
      handoverLocation: dto.handoverLocation.trim(),
      handoverAt: dto.handoverAt ? new Date(dto.handoverAt) : undefined,
      confirmationStatus: HandoverConfirmationStatus.PENDING,
      notes: dto.notes?.trim() || undefined,
    });

    const saved = await this.handoverRepository.save(handover);

    await this.notificationsService.createMany([
      {
        userId: handedOverById,
        title: 'Handover Scheduled',
        message: `Handover for "${claim.item.title}" is scheduled at ${saved.handoverLocation}.`,
        type: NotificationType.CLAIM_UPDATE,
        metadata: { handoverId: saved.id, claimId: claim.id },
      },
      {
        userId: receivedById,
        title: 'Handover Scheduled',
        message: `Please confirm handover once you receive "${claim.item.title}" at ${saved.handoverLocation}.`,
        type: NotificationType.CLAIM_UPDATE,
        metadata: { handoverId: saved.id, claimId: claim.id },
      },
    ]);

    return this.findOne(saved.id, currentUser);
  }

  async confirm(
    id: string,
    currentUser: AuthenticatedUser,
    dto: UpdateHandoverActionDto,
  ): Promise<ItemHandover> {
    const handover = await this.handoverRepository.findOne({
      where: { id },
      relations: {
        claim: {
          item: true,
        },
      },
    });

    if (!handover) {
      throw new NotFoundException('Handover record not found');
    }

    if (
      handover.receivedById !== currentUser.id &&
      currentUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only the receiving owner or an admin can confirm handover',
      );
    }

    if (handover.confirmationStatus !== HandoverConfirmationStatus.PENDING) {
      throw new BadRequestException(
        'Only pending handovers can be confirmed',
      );
    }

    await this.handoverRepository.manager.transaction(async (manager) => {
      const handoverRepo = manager.getRepository(ItemHandover);
      const itemRepo = manager.getRepository(Item);

      handover.confirmationStatus = HandoverConfirmationStatus.CONFIRMED;
      handover.handoverAt = handover.handoverAt ?? new Date();
      if (dto.notes !== undefined) {
        handover.notes = dto.notes.trim() || handover.notes;
      }
      await handoverRepo.save(handover);

      const item = handover.claim?.item;
      if (item && item.status !== ItemStatus.RESOLVED) {
        item.status = ItemStatus.RESOLVED;
        await itemRepo.save(item);
      }

      await this.notificationsService.createMany(
        [
          {
            userId: handover.handedOverById,
            title: 'Handover Confirmed',
            message: `Handover for "${item?.title ?? 'item'}" has been confirmed. Thank you for helping!`,
            type: NotificationType.CLAIM_UPDATE,
            metadata: { handoverId: handover.id, itemId: item?.id },
          },
          {
            userId: handover.receivedById,
            title: 'Item Returned Successfully',
            message: `Handover for "${item?.title ?? 'item'}" is complete and marked resolved.`,
            type: NotificationType.CLAIM_UPDATE,
            metadata: { handoverId: handover.id, itemId: item?.id },
          },
        ],
        manager,
      );
    });

    return this.findOne(id, currentUser);
  }

  async cancel(
    id: string,
    currentUser: AuthenticatedUser,
    dto: UpdateHandoverActionDto,
  ): Promise<ItemHandover> {
    const handover = await this.handoverRepository.findOne({
      where: { id },
      relations: {
        claim: {
          item: true,
        },
      },
    });

    if (!handover) {
      throw new NotFoundException('Handover record not found');
    }

    const isParticipant =
      handover.handedOverById === currentUser.id ||
      handover.receivedById === currentUser.id;
    if (!isParticipant && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only handover participants or an admin can cancel',
      );
    }

    if (handover.confirmationStatus !== HandoverConfirmationStatus.PENDING) {
      throw new BadRequestException('Only pending handovers can be cancelled');
    }

    handover.confirmationStatus = HandoverConfirmationStatus.CANCELLED;
    if (dto.notes !== undefined) {
      handover.notes = dto.notes.trim() || handover.notes;
    }

    await this.handoverRepository.save(handover);

    const otherUserId =
      handover.handedOverById === currentUser.id
        ? handover.receivedById
        : handover.handedOverById;

    await this.notificationsService.createNotification({
      userId: otherUserId,
      title: 'Handover Cancelled',
      message: `The scheduled handover for "${handover.claim?.item?.title ?? 'item'}" was cancelled.`,
      type: NotificationType.CLAIM_UPDATE,
      metadata: { handoverId: handover.id },
    });

    return this.findOne(id, currentUser);
  }
}
