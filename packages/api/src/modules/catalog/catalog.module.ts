import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { PrismaProductsRepository } from './products/products.repository';

import { BrandsController } from './brands/brands.controller';
import { BrandsService } from './brands/brands.service';
import { BrandsRepository } from './brands/brands.repository';

import { CategoriesController } from './categories/categories.controller';
import { CategoriesRepository } from './categories/categories.repository';
import { CategoriesService } from './categories/categories.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController, BrandsController, CategoriesController],
  providers: [ProductsService, PrismaProductsRepository, BrandsService, BrandsRepository, CategoriesRepository, CategoriesService],
  exports: [ProductsService],
})
export class CatalogModule {}
