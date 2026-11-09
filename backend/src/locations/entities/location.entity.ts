import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import type { Item } from '../../items/entities/item.entity.js';
import { decimalTransformer } from '../../common/transformers/decimal.transformer.js';

@Entity('locations')
@Index(['province', 'district', 'municipality'])
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  province: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  district: string;

  @Index()
  @Column({ type: 'varchar', length: 150 })
  municipality: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  area?: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: decimalTransformer,
  })
  latitude?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: decimalTransformer,
  })
  longitude?: number;

  @OneToMany('Item', 'location')
  items: Item[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
