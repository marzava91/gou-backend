import { ProductListItemResponse } from './product-list-item.response';

export class ProductListResponse {
  items: ProductListItemResponse[];
  nextCursor: string | null;
  total: number;
}