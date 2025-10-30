import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Get(':id/products')
  products(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 24,
  ) {
    return this.service.productsByCategory(id, Number(page), Number(pageSize));
  }
}
