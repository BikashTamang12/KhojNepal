import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Category } from '../../categories/entities/category.entity.js';
import { Location } from '../../locations/entities/location.entity.js';
import { ItemImage } from './item-image.entity.js';
import { ReportType } from '../enums/report-type.enum.js';
import { ItemStatus } from '../enums/item-status.enum.js';
import type { Match } from '../../matching/entities/match.entity.js';
import type { Claim } from '../../claims/entities/claim.entity.js';

@Entity('items')
@Index(['reportType', 'status'])
@Index(['categoryId', 'status'])
@Index(['locationId', 'status'])
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.items, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.items, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Index()
  @Column({ name: 'location_id', type: 'uuid' })
  locationId: string;

  @ManyToOne(() => Location, (location) => location.items, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  brand?: string;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  color?: string;

  @Index()
  @Column({
    name: 'report_type',
    type: 'enum',
    enum: ReportType,
  })
  reportType: ReportType;

  @Index()
  @Column({
    type: 'enum',
    enum: ItemStatus,
    default: ItemStatus.OPEN,
  })
  status: ItemStatus;

  @Column({ name: 'date_lost_or_found', type: 'timestamptz' })
  dateLostOrFound: Date;

  @Column({ name: 'specific_location_details', type: 'text', nullable: true })
  specificLocationDetails?: string;

  @Column({ name: 'contact_info', type: 'varchar', length: 150, nullable: true })
  contactInfo?: string;

  @OneToMany(() => ItemImage, (img) => img.item)
  images: ItemImage[];

  @OneToMany('Match', 'lostItem')
  lostMatches: Match[];

  @OneToMany('Match', 'foundItem')
  foundMatches: Match[];

  @OneToMany('Claim', 'item')
  claims: Claim[];

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
