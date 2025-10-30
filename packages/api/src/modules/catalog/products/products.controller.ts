import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Put,
  Delete,
  Body,
} from '@nestjs/common';

import { ProductsService } from './products.service';

@Controller('products') // ✅ NO DUPLICA /v1
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  async list(@Query() q) {
    return this.service.list(q);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() data) {
    return this.service.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
