import { Module } from '@nestjs/common';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { PrismaProductsRepository } from './products/products.repository';
import { PrismaModule } from '../../prisma/prisma.module'; 

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [ProductsService, PrismaProductsRepository],
  exports: [ProductsService],
})
export class CatalogModule {}
