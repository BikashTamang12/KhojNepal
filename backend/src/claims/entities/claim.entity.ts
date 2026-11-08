import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Item } from '../../items/entities/item.entity.js';
import { ClaimStatus } from '../enums/claim-status.enum.js';
import { FinderClaimStatus } from '../enums/finder-claim-status.enum.js';
import type { ItemHandover } from '../../handovers/entities/item-handover.entity.js';

@Entity('claims')
@Index(['itemId', 'status'])
@Index(['claimantId', 'status'])
export class Claim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @ManyToOne(() => Item, (item) => item.claims, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @Index()
  @Column({ name: 'claimant_id', type: 'uuid' })
  claimantId: string;

  @ManyToOne(() => User, (user) => user.claims, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'claimant_id' })
  claimant: User;

  @Column({ type: 'text' })
  explanation: string;

  @Column({ name: 'evidence_description', type: 'text' })
  evidenceDescription: string;

  @Column({
    name: 'finder_status',
    type: 'enum',
    enum: FinderClaimStatus,
    default: FinderClaimStatus.PENDING,
  })
  finderStatus: FinderClaimStatus;

  @Column({ name: 'finder_reviewed_at', type: 'timestamptz', nullable: true })
  finderReviewedAt?: Date;

  @Column({ name: 'finder_notes', type: 'text', nullable: true })
  finderNotes?: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ClaimStatus,
    default: ClaimStatus.PENDING,
  })
  status: ClaimStatus;

  @Column({ name: 'reviewed_by_id', type: 'uuid', nullable: true })
  reviewedById?: string;

  @ManyToOne(() => User, (user) => user.reviewedClaims, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy?: User;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes?: string;

  @OneToOne('ItemHandover', 'claim')
  handover?: ItemHandover;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
