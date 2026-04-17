// A) products.controller.ts (HTTP layer)
// “Qué entra y por dónde entra” → DTOs de entrada
// Aquí vive todo lo que es “Web/API”:
// - Rutas (GET/POST/PATCH/DELETE)
// - Leer @Query, @Param, @Body, @Headers
// - DTOs para validar la entrada
// - HTTP errors (404, 400) cuando aplica
// - (Opcional) Swagger decorators
// REGLA: el controller no debe hablar con Prisma directo.

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('catalog/products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  private tenantIdOrThrow(tenantId?: string) {
    if (!tenantId) {
      throw new BadRequestException('Missing x-tenant-id header');
    }
    return tenantId;
  }

  @Get()
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: QueryProductsDto,
  ) {
    const safeTenant = this.tenantIdOrThrow(tenantId);
    return { data: await this.service.list(safeTenant, query) };
  }

  @Get(':id')
  async getOne(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const safeTenant = this.tenantIdOrThrow(tenantId);
    return { data: await this.service.findOne(safeTenant, id) };
  }

  @Post()
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() data: CreateProductDto,
  ) {
    const safeTenant = this.tenantIdOrThrow(tenantId);
    return { data: await this.service.create(safeTenant, data) };
  }

  @Patch(':id')
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() data: UpdateProductDto,
  ) {
    const safeTenant = this.tenantIdOrThrow(tenantId);
    return { data: await this.service.update(safeTenant, id, data) };
  }

  @Delete(':id')
  async remove(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const safeTenant = this.tenantIdOrThrow(tenantId);
    return { data: await this.service.delete(safeTenant, id) };
  }
}
