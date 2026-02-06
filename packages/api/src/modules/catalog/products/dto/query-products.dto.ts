import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { BcgTag, Visibility } from '@prisma/client';

const SORT_BY = [
  'createdAt',
  'updatedAt',
  'title',
  'sku',
  'barcode',
  'visibility',
  'isFeatured',

  // Ordenables por tienda (StockItem)
  'stockOnHand',
  'reorderPoint',
  'lotExpiresAt',
] as const;

type SortBy = typeof SORT_BY[number];
type SortDir = 'asc' | 'desc';

export class QueryProductsDto {
  // ===== Search =====
  @ApiPropertyOptional({ 
    description: 'Texto libre de búsqueda (title, sku, barcode, id)', 
    maxLength: 80 
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @ApiPropertyOptional({ description: 'SKU exacto', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string;

  @ApiPropertyOptional({ description: 'Barcode exacto', maxLength: 32 })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  barcode?: string;

  // ===== Filters (tabla) =====
  @ApiPropertyOptional({ enum: BcgTag, description: 'Clasificación BCG del producto' })
  @IsOptional()
  @IsEnum(BcgTag)
  bcgTag?: BcgTag;

  @ApiPropertyOptional({ enum: Visibility })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @ApiPropertyOptional({ description: 'Filtra por marca (Brand.id)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  brandId?: string;

  @ApiPropertyOptional({ description: 'Filtra por categoría (Category.id)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  categoryId?: string;

  // ===== Tenancy =====
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenantId?: string; // Corregir en un futuro para que este Id venga del contexto del request

  /**
   * storeId:
   * - 'global' => catálogo global (Item.storeId = null)
   * - '<uuid>' => inventario por tienda (join StockItem)
   * - omitido  => no filtra por storeId (opcional)
   */
  @ApiPropertyOptional({
    description: `StoreId para inventario. Usa "global" para catálogo global (storeId=null).`,
    example: 'global',
  })
  @IsOptional()
  @IsString()
  storeId?: string; 

  // ===== Pagination (offset) =====
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 250 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(250)
  limit: number = 20;

  // ===== Sorting =====
  @ApiPropertyOptional({ enum: SORT_BY, description: 'Campo de ordenamiento' })
  @IsOptional()
  @IsIn(SORT_BY)
  sortBy?: SortBy;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir: SortDir = 'desc';
}
