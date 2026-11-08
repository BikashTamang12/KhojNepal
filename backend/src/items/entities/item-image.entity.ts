import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Item } from './item.entity.js';

@Entity('item_images')
export class ItemImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @ManyToOne(() => Item, (item) => item.images, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath: string;

  @Column({ name: 'original_filename', type: 'varchar', length: 255, nullable: true })
  originalFilename?: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType?: string;

  @Column({ name: 'file_size', type: 'integer', nullable: true })
  fileSize?: number;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
