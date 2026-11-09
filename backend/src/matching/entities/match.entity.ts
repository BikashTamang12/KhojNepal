import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
  Check,
  type Relation,
} from 'typeorm';
import { Item } from '../../items/entities/item.entity.js';
import { MatchStatus } from '../enums/match-status.enum.js';

@Entity('matches')
@Unique('UQ_matches_lost_found', ['lostItemId', 'foundItemId'])
@Check('CHK_matches_no_self_match', '"lost_item_id" <> "found_item_id"')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'lost_item_id', type: 'uuid' })
  lostItemId: string;

  @ManyToOne(() => Item, (item) => item.lostMatches, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'lost_item_id' })
  lostItem: Relation<Item>;

  @Index()
  @Column({ name: 'found_item_id', type: 'uuid' })
  foundItemId: string;

  @ManyToOne(() => Item, (item) => item.foundMatches, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'found_item_id' })
  foundItem: Relation<Item>;

  @Column({ name: 'text_score', type: 'decimal', precision: 5, scale: 4 })
  textScore: number;

  @Column({ name: 'image_score', type: 'decimal', precision: 5, scale: 4 })
  imageScore: number;

  @Column({ name: 'location_score', type: 'decimal', precision: 5, scale: 4 })
  locationScore: number;

  @Column({ name: 'time_score', type: 'decimal', precision: 5, scale: 4 })
  timeScore: number;

  @Index()
  @Column({ name: 'final_score', type: 'decimal', precision: 5, scale: 4 })
  finalScore: number;

  @Index()
  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.PENDING,
  })
  status: MatchStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
