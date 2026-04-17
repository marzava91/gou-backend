// packages\api\src\modules\pricing\item-prices\dto\query-item-prices.dto.ts
import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class QueryItemPricesDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  priceListId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  itemId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  variantId?: string;

  // fecha “contextual” para calcular vigencia (si no envías, lista todo)
  @IsOptional()
  @IsISO8601()
  activeAt?: string;

  // "true" para incluir expirados; si activeAt está presente, esto usualmente no se usa
  @IsOptional()
  @IsString()
  includeExpired?: string;
}
