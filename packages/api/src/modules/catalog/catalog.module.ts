import { Module } from '@nestjs/common';
import { FirebaseModule } from '../../integrations/firebase/firebase.module';

import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { FirebaseProductsRepository } from './products/products.repository';

@Module({
  imports: [FirebaseModule],
  controllers: [ProductsController],
  providers: [ProductsService, FirebaseProductsRepository],
  exports: [ProductsService],
})
export class CatalogModule {}
