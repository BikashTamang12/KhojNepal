import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { Category } from './entities/category.entity.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }
}
