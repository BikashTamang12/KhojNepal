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
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Claim } from '../../claims/entities/claim.entity.js';
import { HandoverConfirmationStatus } from '../enums/handover-confirmation-status.enum.js';

@Entity('item_handovers')
export class ItemHandover {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'claim_id', type: 'uuid', unique: true })
  claimId: string;

  @OneToOne(() => Claim, (claim) => claim.handover, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'claim_id' })
  claim: Relation<Claim>;

  @Index()
  @Column({ name: 'handed_over_by_id', type: 'uuid' })
  handedOverById: string;

  @ManyToOne(() => User, (user) => user.handedOverItems, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'handed_over_by_id' })
  handedOverBy: Relation<User>;

  @Index()
  @Column({ name: 'received_by_id', type: 'uuid' })
  receivedById: string;

  @ManyToOne(() => User, (user) => user.receivedItems, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'received_by_id' })
  receivedBy: Relation<User>;

  @Column({ name: 'handover_location', type: 'varchar', length: 255 })
  handoverLocation: string;

  @Column({ name: 'handover_at', type: 'timestamptz', nullable: true })
  handoverAt?: Date;

  @Index()
  @Column({
    name: 'confirmation_status',
    type: 'enum',
    enum: HandoverConfirmationStatus,
    default: HandoverConfirmationStatus.PENDING,
  })
  confirmationStatus: HandoverConfirmationStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
