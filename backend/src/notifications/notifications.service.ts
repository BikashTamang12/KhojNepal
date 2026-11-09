import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity.js';
import { NotificationType } from './enums/notification-type.enum.js';
import { QueryNotificationDto } from './dto/query-notification.dto.js';
import {
  buildPaginatedResponse,
  type PaginatedResponse,
} from '../common/interfaces/paginated-result.interface.js';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async createNotification(
    input: CreateNotificationInput,
    manager?: EntityManager,
  ): Promise<Notification> {
    const repo = manager
      ? manager.getRepository(Notification)
      : this.notificationRepository;

    const entity = repo.create({
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      metadata: input.metadata,
      isRead: false,
    });

    return repo.save(entity);
  }

  async createMany(
    inputs: CreateNotificationInput[],
    manager?: EntityManager,
  ): Promise<Notification[]> {
    if (inputs.length === 0) return [];
    const repo = manager
      ? manager.getRepository(Notification)
      : this.notificationRepository;

    const entities = inputs.map((input) =>
      repo.create({
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
        metadata: input.metadata,
        isRead: false,
      }),
    );

    return repo.save(entities);
  }

  async findForUser(
    userId: string,
    query: QueryNotificationDto,
  ): Promise<PaginatedResponse<Notification>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const where: FindOptionsWhere<Notification> = { userId };
    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }
    if (query.type !== undefined) {
      where.type = query.type;
    }

    const [data, total] = await this.notificationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return buildPaginatedResponse(data, total, page, limit);
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });
    return { unreadCount };
  }

  async markAsRead(userId: string, id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not have access to this notification');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      await this.notificationRepository.save(notification);
    }

    return notification;
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { updated: result.affected ?? 0 };
  }
}
