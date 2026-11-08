import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemHandover } from './entities/item-handover.entity.js';

@Injectable()
export class HandoversService {
  constructor(
    @InjectRepository(ItemHandover)
    private readonly handoverRepository: Repository<ItemHandover>,
  ) {}

  findAll(): Promise<ItemHandover[]> {
    return this.handoverRepository.find({
      relations: {
        claim: true,
        handedOverBy: true,
        receivedBy: true,
      },
      order: { createdAt: 'DESC' },
    });
  }
}
