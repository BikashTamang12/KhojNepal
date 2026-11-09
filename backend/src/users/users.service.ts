import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import { UserRole } from './enums/user-role.enum.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { sanitizeUser } from '../common/utils/user-serializer.util.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Item } from '../items/entities/item.entity.js';
import { Claim } from '../claims/entities/claim.entity.js';
import { Notification } from '../notifications/entities/notification.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createUser(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    phone?: string;
    role?: UserRole;
  }): Promise<AuthenticatedUser> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const existing = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const user = this.userRepository.create({
      fullName: data.fullName.trim(),
      email: normalizedEmail,
      passwordHash: data.passwordHash,
      phone: data.phone?.trim() || undefined,
      role: data.role ?? UserRole.USER,
    });

    const saved = await this.userRepository.save(user);
    return sanitizeUser(saved);
  }

  async findByEmailForAuth(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = :email', { email: normalizedEmail })
      .getOne();
  }

  async findById(id: string): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return sanitizeUser(user);
  }

  async findActiveById(id: string): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is unavailable or inactive');
    }
    return sanitizeUser(user);
  }

  async getProfileWithStats(userId: string) {
    const user = await this.findById(userId);
    const [itemsCount, claimsCount, unreadNotificationsCount] = await Promise.all([
      this.userRepository.manager.count(Item, { where: { userId } }),
      this.userRepository.manager.count(Claim, { where: { claimantId: userId } }),
      this.userRepository.manager.count(Notification, {
        where: { userId, isRead: false },
      }),
    ]);

    return {
      ...user,
      stats: {
        itemsCount,
        claimsCount,
        unreadNotificationsCount,
      },
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName.trim();
    }
    if (dto.phone !== undefined) {
      user.phone = dto.phone.trim() || undefined;
    }

    const updated = await this.userRepository.save(user);
    return sanitizeUser(updated);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(dto.newPassword, salt);
    await this.userRepository.save(user);

    return { message: 'Password updated successfully' };
  }
}
