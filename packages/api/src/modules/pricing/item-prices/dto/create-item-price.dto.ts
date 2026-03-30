// packages\api\src\modules\pricing\item-prices\dto\create-item-price.dto.ts
import { IsISO8601, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateItemPriceDto {
  @IsString()
  @MaxLength(64)
  priceListId!: string;

  @IsString()
  @MaxLength(64)
  itemId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  variantId?: string;

  // Decimal(12,4) -> lo validamos como string decimal (hasta 4 decimales)
  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  amount!: string;

  @IsOptional()
  @IsISO8601()
  validFrom?: string; // default now() en DB si no mandas

  @IsOptional()
  @IsISO8601()
  validTo?: string; // null = vigente indefinido

  @IsOptional()
  @IsString()
  @MaxLength(64)
  createdBy?: string;
}