// A) products.controller.ts (HTTP layer)
// “Qué entra y por dónde entra” → DTOs de entrada
// Aquí vive todo lo que es “Web/API”:
// - Rutas (GET/POST/PATCH/DELETE)
// - Leer @Query, @Param, @Body, @Headers
// - DTOs para validar la entrada
// - HTTP errors (404, 400) cuando aplica
// - (Opcional) Swagger decorators
// REGLA: el controller no debe hablar con Prisma directo.

import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('catalog/products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  async list(@Query() query: QueryProductsDto) {
    return { data: await this.service.list(query) };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return { data: await this.service.findOne(id) };
  }

  @Post()
  async create(@Body() data: CreateProductDto) {
    return { data: await this.service.create(data) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: UpdateProductDto) {
    return { data: await this.service.update(id, data) };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return { data: await this.service.delete(id) };
  }
}

