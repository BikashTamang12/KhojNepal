import { Exclude } from 'class-transformer';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum.js';
import type { Item } from '../../items/entities/item.entity.js';
import type { Claim } from '../../claims/entities/claim.entity.js';
import type { ItemHandover } from '../../handovers/entities/item-handover.entity.js';
import type { Notification } from '../../notifications/entities/notification.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Exclude()
  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @OneToMany('Item', 'user')
  items: Item[];

  @OneToMany('Claim', 'claimant')
  claims: Claim[];

  @OneToMany('Claim', 'reviewedBy')
  reviewedClaims: Claim[];

  @OneToMany('ItemHandover', 'handedOverBy')
  handedOverItems: ItemHandover[];

  @OneToMany('ItemHandover', 'receivedBy')
  receivedItems: ItemHandover[];

  @OneToMany('Notification', 'user')
  notifications: Notification[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
