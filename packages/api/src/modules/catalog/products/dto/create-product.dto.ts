import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, Matches } from 'class-validator';
import { ItemType, Visibility, SellUnit, BcgTag } from '@prisma/client';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @MaxLength(140)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: ItemType, default: ItemType.RETAIL })
  @IsOptional()
  @IsEnum(ItemType)
  itemType?: ItemType;

  @ApiPropertyOptional({ enum: Visibility, default: Visibility.VISIBLE })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @ApiPropertyOptional({ enum: SellUnit, default: SellUnit.UNIT })
  @IsOptional()
  @IsEnum(SellUnit)
  sellUnit?: SellUnit;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Código de barras (8 a 14 dígitos típicamente)',
    example: '7751234567890',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^[0-9A-Za-z\-]+$/, { message: 'barcode must be alphanumeric (digits/hyphen)'} )
  barcode?: string;

  @ApiPropertyOptional({ enum: BcgTag, default: BcgTag.UNCLASSIFIED })
  @IsOptional()
  @IsEnum(BcgTag)
  bcgTag?: BcgTag;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional({ description: 'IDs de categorías asociadas' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  // ===== Inventario MVP (opcional) =====
  // Nota: Stock real se controla con StockItem; esto solo inicializa.
  @ApiPropertyOptional({ description: 'Stock inicial (onHand) para la tienda', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  initialStockOnHand?: number;

  @ApiPropertyOptional({ description: 'Stock seguridad (reorderPoint)', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  reorderPoint?: number;
}
