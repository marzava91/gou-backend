// packages\api\src\modules\catalog\brands\responses\brand.response.ts
export type BrandResponse = {
  id: string;
  tenantId: string;
  name: string;
  imageUrl: string | null;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BrandListResponse = {
  data: BrandResponse[];
  nextCursor?: string | null;
};