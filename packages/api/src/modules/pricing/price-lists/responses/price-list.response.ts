//packages\api\src\modules\pricing\price-lists\responses\price-list.response.ts
import { PriceListCode } from '@prisma/client';

export class PriceListResponse {
  id!: string;
  tenantId!: string;

  code!: PriceListCode;
  name!: string;
  currency!: string;
  isActive!: boolean;

  createdAt!: string;
  updatedAt!: string;
}