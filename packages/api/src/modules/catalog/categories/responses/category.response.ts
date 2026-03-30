//  packages\api\src\modules\catalog\categories\responses\category.response.ts
export type CategoryResponse = {
  id: string;
  tenantId: string;
  name: string;
  parentId: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  depth?: number;  // si lo tienes en schema
  path?: string | null; // si lo tienes en schema
  createdAt: string;
  updatedAt: string;
};

export type ListResponse<T> = { data: T[] };
export type ItemResponse<T> = { data: T };