import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Match } from './entities/match.entity.js';
import { MatchStatus } from './enums/match-status.enum.js';
import { Item } from '../items/entities/item.entity.js';
import { ReportType } from '../items/enums/report-type.enum.js';
import { ItemStatus } from '../items/enums/item-status.enum.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../notifications/enums/notification-type.enum.js';
import { QueryMatchesDto } from './dto/query-matches.dto.js';
import {
  buildPaginatedResponse,
  type PaginatedResponse,
} from '../common/interfaces/paginated-result.interface.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { toPublicUserSummary } from '../common/utils/user-serializer.util.js';
import {
  computeBestImageScore,
  type ImageSignature,
  loadSignatureFromFile,
} from './utils/image-similarity.util.js';
import { computeMatchScores } from './utils/scoring.util.js';

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  async generateMatchesForItem(itemId: string): Promise<Match[]> {
    const sourceItem = await this.itemRepository.findOne({
      where: { id: itemId },
      relations: {
        location: true,
        category: true,
        images: true,
      },
    });

    if (
      !sourceItem ||
      (sourceItem.status !== ItemStatus.OPEN &&
        sourceItem.status !== ItemStatus.CLAIM_PENDING)
    ) {
      return [];
    }

    const oppositeType =
      sourceItem.reportType === ReportType.LOST
        ? ReportType.FOUND
        : ReportType.LOST;

    const candidates = await this.itemRepository.find({
      where: {
        reportType: oppositeType,
        status: ItemStatus.OPEN,
      },
      relations: {
        location: true,
        category: true,
        images: true,
      },
      take: 200,
      order: { createdAt: 'DESC' },
    });

    if (candidates.length === 0) {
      return [];
    }

    const uploadDir = this.configService.get<string>('UPLOAD_DIR', 'uploads');
    const threshold = Number(
      this.configService.get<string | number>('MATCH_THRESHOLD') ?? 0.35,
    );

    const sourceSignatures = await this.loadSignatures(sourceItem, uploadDir);
    const savedMatches: Match[] = [];

    for (const candidate of candidates) {
      if (candidate.id === sourceItem.id) continue;
      if (candidate.userId === sourceItem.userId) continue;

      const lostItem =
        sourceItem.reportType === ReportType.LOST ? sourceItem : candidate;
      const foundItem =
        sourceItem.reportType === ReportType.FOUND ? sourceItem : candidate;

      const candidateSignatures = await this.loadSignatures(candidate, uploadDir);
      const lostSignatures =
        sourceItem.reportType === ReportType.LOST
          ? sourceSignatures
          : candidateSignatures;
      const foundSignatures =
        sourceItem.reportType === ReportType.FOUND
          ? sourceSignatures
          : candidateSignatures;

      const imageResult = computeBestImageScore(lostSignatures, foundSignatures);
      const scores = computeMatchScores(lostItem, foundItem, imageResult);

      if (scores.finalScore < threshold) {
        continue;
      }

      const existing = await this.matchRepository.findOne({
        where: {
          lostItemId: lostItem.id,
          foundItemId: foundItem.id,
        },
      });

      if (existing) {
        existing.textScore = scores.textScore;
        existing.imageScore = scores.imageScore;
        existing.locationScore = scores.locationScore;
        existing.timeScore = scores.timeScore;
        existing.finalScore = scores.finalScore;
        savedMatches.push(await this.matchRepository.save(existing));
      } else {
        const match = this.matchRepository.create({
          lostItemId: lostItem.id,
          foundItemId: foundItem.id,
          ...scores,
          status: MatchStatus.PENDING,
        });
        const created = await this.matchRepository.save(match);
        savedMatches.push(created);

        const percent = Math.round(scores.finalScore * 100);
        await this.notificationsService.createMany([
          {
            userId: lostItem.userId,
            title: 'Potential Match Found',
            message: `We found a ${percent}% match for your lost item "${lostItem.title}".`,
            type: NotificationType.MATCH_FOUND,
            metadata: {
              matchId: created.id,
              lostItemId: lostItem.id,
              foundItemId: foundItem.id,
              finalScore: scores.finalScore,
            },
          },
          {
            userId: foundItem.userId,
            title: 'Potential Owner Match Found',
            message: `Your found item "${foundItem.title}" has a ${percent}% match with a lost report.`,
            type: NotificationType.MATCH_FOUND,
            metadata: {
              matchId: created.id,
              lostItemId: lostItem.id,
              foundItemId: foundItem.id,
              finalScore: scores.finalScore,
            },
          },
        ]);
      }
    }

    return savedMatches;
  }

  async findMyMatches(
    userId: string,
    query: QueryMatchesDto,
  ): Promise<PaginatedResponse<Match>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const qb = this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.lostItem', 'lostItem')
      .leftJoinAndSelect('lostItem.category', 'lostCategory')
      .leftJoinAndSelect('lostItem.location', 'lostLocation')
      .leftJoinAndSelect('lostItem.images', 'lostImages')
      .leftJoinAndSelect('match.foundItem', 'foundItem')
      .leftJoinAndSelect('foundItem.category', 'foundCategory')
      .leftJoinAndSelect('foundItem.location', 'foundLocation')
      .leftJoinAndSelect('foundItem.images', 'foundImages')
      .where(
        new Brackets((scope) => {
          scope
            .where('lostItem.userId = :userId', { userId })
            .orWhere('foundItem.userId = :userId', { userId });
        }),
      );

    if (query.status) {
      qb.andWhere('match.status = :status', { status: query.status });
    }

    if (query.itemId) {
      qb.andWhere(
        new Brackets((itemScope) => {
          itemScope
            .where('match.lostItemId = :itemId', { itemId: query.itemId })
            .orWhere('match.foundItemId = :itemId', { itemId: query.itemId });
        }),
      );
    }

    qb.orderBy('match.finalScore', 'DESC')
      .addOrderBy('match.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResponse(data, total, page, limit);
  }

  async findForItem(
    itemId: string,
    currentUser: AuthenticatedUser,
    query: QueryMatchesDto,
  ): Promise<PaginatedResponse<Match>> {
    const item = await this.itemRepository.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (
      item.userId !== currentUser.id &&
      currentUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('You do not have access to matches for this item');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const qb = this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.lostItem', 'lostItem')
      .leftJoinAndSelect('lostItem.category', 'lostCategory')
      .leftJoinAndSelect('lostItem.location', 'lostLocation')
      .leftJoinAndSelect('lostItem.images', 'lostImages')
      .leftJoinAndSelect('match.foundItem', 'foundItem')
      .leftJoinAndSelect('foundItem.category', 'foundCategory')
      .leftJoinAndSelect('foundItem.location', 'foundLocation')
      .leftJoinAndSelect('foundItem.images', 'foundImages')
      .where(
        new Brackets((scope) => {
          scope
            .where('match.lostItemId = :itemId', { itemId })
            .orWhere('match.foundItemId = :itemId', { itemId });
        }),
      );

    if (query.status) {
      qb.andWhere('match.status = :status', { status: query.status });
    }

    qb.orderBy('match.finalScore', 'DESC')
      .addOrderBy('match.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResponse(data, total, page, limit);
  }

  async triggerForItem(
    itemId: string,
    currentUser: AuthenticatedUser,
  ): Promise<{ generatedCount: number; matches: Match[] }> {
    const item = await this.itemRepository.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (
      item.userId !== currentUser.id &&
      currentUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('Only the item owner or an admin can run matching');
    }

    const matches = await this.generateMatchesForItem(itemId);
    return { generatedCount: matches.length, matches };
  }

  async findOne(id: string, currentUser: AuthenticatedUser): Promise<Match> {
    const match = await this.matchRepository.findOne({
      where: { id },
      relations: {
        lostItem: {
          category: true,
          location: true,
          images: true,
          user: true,
        },
        foundItem: {
          category: true,
          location: true,
          images: true,
          user: true,
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const isParticipant =
      match.lostItem.userId === currentUser.id ||
      match.foundItem.userId === currentUser.id;
    if (!isParticipant && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have access to this match');
    }

    if (match.lostItem?.user) {
      (match.lostItem as unknown as { user?: unknown }).user = toPublicUserSummary(
        match.lostItem.user,
      );
      if (match.lostItem.userId !== currentUser.id && currentUser.role !== UserRole.ADMIN) {
        match.lostItem.contactInfo = undefined;
      }
    }
    if (match.foundItem?.user) {
      (match.foundItem as unknown as { user?: unknown }).user = toPublicUserSummary(
        match.foundItem.user,
      );
      if (match.foundItem.userId !== currentUser.id && currentUser.role !== UserRole.ADMIN) {
        match.foundItem.contactInfo = undefined;
      }
    }

    return match;
  }

  async updateStatus(
    id: string,
    status: MatchStatus.ACCEPTED | MatchStatus.REJECTED,
    currentUser: AuthenticatedUser,
  ): Promise<Match> {
    const match = await this.findOne(id, currentUser);
    match.status = status;
    const saved = await this.matchRepository.save(match);

    const otherUserId =
      match.lostItem.userId === currentUser.id
        ? match.foundItem.userId
        : match.lostItem.userId;

    if (otherUserId && otherUserId !== currentUser.id) {
      await this.notificationsService.createNotification({
        userId: otherUserId,
        title:
          status === MatchStatus.ACCEPTED ? 'Match Accepted' : 'Match Dismissed',
        message:
          status === MatchStatus.ACCEPTED
            ? `A match between "${match.lostItem.title}" and "${match.foundItem.title}" was accepted.`
            : `A suggested match between "${match.lostItem.title}" and "${match.foundItem.title}" was marked as not a match.`,
        type: NotificationType.MATCH_FOUND,
        metadata: {
          matchId: match.id,
          status,
        },
      });
    }

    return saved;
  }

  private async loadSignatures(
    item: Item,
    uploadDir: string,
  ): Promise<ImageSignature[]> {
    if (!item.images || item.images.length === 0) return [];
    const results = await Promise.all(
      item.images.map((img) =>
        loadSignatureFromFile(img.filePath, img.mimeType, uploadDir),
      ),
    );
    return results.filter((sig): sig is ImageSignature => sig !== null);
  }
}
