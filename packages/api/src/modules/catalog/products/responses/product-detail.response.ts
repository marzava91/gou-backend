// src/modules/catalog/products/dto/product-detail.response.ts
import {
  Visibility,
  ItemType,
  SellUnit,
  DocumentType,
  BcgTag,
} from '@prisma/client';

export class ProductCategoryResponse {
  id: string;
  name: string;
  parentId: string | null;
}

export class ProductBrandResponse {
  id: string;
  name: string;
  imageUrl?: string | null;
}

export class ProductDocumentResponse {
  id: string;
  type: DocumentType;
  url: string;
  sortOrder: number;
  meta?: any;
  createdAt: string;
}

export class ProductPriceResponse {
  id: string;
  priceListId: string;
  amount: number;          // Decimal -> number
  validFrom: string;
  validTo?: string | null;
  createdAt: string;
}

export class ProductPriceTierResponse {
  id: string;
  priceListId: string;
  minQty: number;
  price: number;           // Decimal -> number
  createdAt: string;
}

export class ProductDetailResponse {
  id: string;
  tenantId: string;
  storeId: string | null;

  title: string;
  description?: string | null;
  sku: string | null;

  itemType: ItemType;
  visibility: Visibility;
  isFeatured: boolean;

  sellUnit: SellUnit;
  isWeighable: boolean;
  taxRate: number;
  tracksStock: boolean;

  thumbnailUrl?: string | null;
  bcgTag: BcgTag;

  brand?: ProductBrandResponse | null;
  categories: ProductCategoryResponse[];

  documents: ProductDocumentResponse[];

  prices: ProductPriceResponse[];        // historial / vigentes
  priceTiers: ProductPriceTierResponse[]; // escalonados

  createdAt: string;
  updatedAt: string;
}
