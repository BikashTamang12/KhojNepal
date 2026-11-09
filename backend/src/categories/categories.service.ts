import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  findAll(includeInactive = false): Promise<Category[]> {
    return this.categoryRepository.find({
      where: includeInactive ? {} : { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const name = dto.name.trim();
    const existing = await this.categoryRepository
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', { name })
      .getOne();

    if (existing) {
      throw new ConflictException(`Category "${name}" already exists`);
    }

    const category = this.categoryRepository.create({
      name,
      description: dto.description?.trim() || undefined,
      isActive: dto.isActive ?? true,
    });

    return this.categoryRepository.save(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    if (dto.name !== undefined) {
      const normalized = dto.name.trim();
      const duplicate = await this.categoryRepository
        .createQueryBuilder('category')
        .where('LOWER(category.name) = LOWER(:name)', { name: normalized })
        .andWhere('category.id != :id', { id })
        .getOne();
      if (duplicate) {
        throw new ConflictException(`Category "${normalized}" already exists`);
      }
      category.name = normalized;
    }

    if (dto.description !== undefined) {
      category.description = dto.description.trim() || undefined;
    }

    if (dto.isActive !== undefined) {
      category.isActive = dto.isActive;
    }

    return this.categoryRepository.save(category);
  }

  async deactivate(id: string): Promise<Category> {
    const category = await this.findOne(id);
    category.isActive = false;
    return this.categoryRepository.save(category);
  }
}
