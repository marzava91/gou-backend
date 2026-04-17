// packages\api\src\modules\pricing\store-price-lists\dto\query-store-price-lists.dto.ts
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SalesChannel } from '@prisma/client';

export class QueryStorePriceListsDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  storeId?: string;

  @IsOptional()
  @IsEnum(SalesChannel)
  channel?: SalesChannel;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  priceListId?: string;
}
