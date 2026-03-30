// packages\api\src\modules\pricing\pricing.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

import { PriceListsController } from './price-lists/price-lists.controller';
import { PriceListsService } from './price-lists/price-lists.service';
import { PriceListsRepository } from './price-lists/price-lists.repository';

import { ItemPricesController } from './item-prices/item-prices.controller';
import { ItemPricesService } from './item-prices/item-prices.service';
import { ItemPricesRepository } from './item-prices/item-prices.repository';

import { StorePriceListsController } from './store-price-lists/store-price-lists.controller';
import { StorePriceListsService } from './store-price-lists/store-price-lists.service';
import { StorePriceListsRepository } from './store-price-lists/store-price-lists.repository';

import { PriceResolverController } from './price-resolver/price-resolver.controller';
import { PriceResolverService } from './price-resolver/price-resolver.service';
import { PriceResolverRepository } from './price-resolver/price-resolver.repostery';

@Module({
  imports: [PrismaModule],
  controllers: [
    PriceListsController,
    ItemPricesController,
    StorePriceListsController,
    PriceResolverController,
  ],
  providers: [
    PriceListsService,
    PriceListsRepository,

    ItemPricesService,
    ItemPricesRepository,

    StorePriceListsService,
    StorePriceListsRepository,

    PriceResolverService,
    PriceResolverRepository,
  ],
  exports: [
    PriceListsService,
    ItemPricesService,
    StorePriceListsService,
    PriceResolverService, 
  ],
})
export class PricingModule {}