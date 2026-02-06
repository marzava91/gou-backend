// src/modules/catalog/products/responses/product-list-item.response.ts
import { Visibility, ItemType, SellUnit, BcgTag } from '@prisma/client';

export class ProductListItemResponse {
  id: string;
  tenantId: string;
  storeId: string | null;

  title: string;
  sku: string | null;

  barcode?: string | null;
  primaryCategoryName?: string | null;
  brandName?: string | null;
  bcgTag: BcgTag;

  retailPrice?: number | null;
  stock?: number | null;

  itemType: ItemType;
  visibility: Visibility;
  isFeatured: boolean;

  sellUnit: SellUnit;
  taxRate: number;

  thumbnailUrl: string | null;

  createdAt: string;
  updatedAt: string;

  lotCode?: string | null;
  expiresAt?: string | null;
  reorderPoint?: number | null;
}


