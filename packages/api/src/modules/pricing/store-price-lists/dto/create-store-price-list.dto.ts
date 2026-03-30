// packages\api\src\modules\pricing\store-price-lists\dto\create-store-price-list.dto.ts
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SalesChannel } from '@prisma/client';

export class CreateStorePriceListDto {
  @IsString()
  @MaxLength(64)
  storeId!: string;

  @IsString()
  @MaxLength(64)
  priceListId!: string;

  @IsOptional()
  @IsEnum(SalesChannel)
  channel?: SalesChannel; // default POS en DB

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean; // default false en DB
}