// packages\api\src\modules\pricing\store-price-lists\responses\store-price-list.response.ts
import { SalesChannel } from '@prisma/client';

export class StorePriceListResponse {
  tenantId!: string;
  storeId!: string;
  priceListId!: string;

  channel!: SalesChannel;
  isDefault!: boolean;

  createdAt!: string;
}
