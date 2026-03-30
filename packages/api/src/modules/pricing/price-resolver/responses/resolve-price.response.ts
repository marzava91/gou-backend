// packages\api\src\modules\pricing\price-resolver\responses\resolve-price.response.ts
import { SalesChannel } from '@prisma/client';

export class ResolvePriceResponse {
  tenantId!: string;

  storeId!: string;
  channel!: SalesChannel;

  itemId!: string;
  variantId?: string | null;

  qty!: number;
  at!: string;

  // resultado final
  unitPrice!: string;
  extendedPrice!: string; // unitPrice * qty

  // trazabilidad
  resolvedFrom!: 'EXPLICIT_PRICE_LIST' | 'STORE_DEFAULT' | 'FALLBACK';
  priceListId!: string;

  itemPriceId!: string;
  baseAmount!: string; // ItemPrice.amount
  tierApplied!: boolean;

  tier?: {
    id: string;
    minQty: number;
    maxQty?: number | null;
    unitPrice: string;
  } | null;
}