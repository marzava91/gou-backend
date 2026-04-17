// packages\api\src\modules\pricing\item-prices\dto\update-item-price.dto.ts
import {
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateItemPriceDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,4})?$/)
  amount?: string;

  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @IsOptional()
  @IsISO8601()
  validTo?: string;

  // priceListId / itemId / variantId NO se actualizan (recomendado)
  @IsOptional()
  @IsString()
  @MaxLength(64)
  createdBy?: string;
}
