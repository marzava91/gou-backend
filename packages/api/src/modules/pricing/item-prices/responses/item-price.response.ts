// packages\api\src\modules\pricing\item-prices\responses\item-price.response.ts
export class ItemPriceResponse {
  id!: string;
  tenantId!: string;

  priceListId!: string;
  itemId!: string;
  variantId?: string | null;

  amount!: string;

  validFrom!: string;
  validTo?: string | null;

  createdBy?: string | null;
  createdAt!: string;
  updatedAt!: string;
}