// packages\api\src\modules\pricing\price-resolver\dto\resolve-price.dto.ts
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { SalesChannel } from '@prisma/client';

export class ResolvePriceDto {
  @IsString()
  @MaxLength(64)
  storeId!: string;

  @IsEnum(SalesChannel)
  channel!: SalesChannel;

  @IsString()
  @MaxLength(64)
  itemId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  variantId?: string;

  @IsInt()
  @Min(1)
  qty!: number;

  @IsOptional()
  @IsISO8601()
  at?: string; // default now()

  // opcional: permite resolver usando una lista específica (ej. carrito guardó priceListId)
  @IsOptional()
  @IsString()
  @MaxLength(64)
  priceListId?: string;

  // opcional: si priceListId apunta a una promo y no hay precio del item allí,
  // puedes caer a esta (ej. RETAIL)
  @IsOptional()
  @IsString()
  @MaxLength(64)
  fallbackPriceListId?: string;
}
