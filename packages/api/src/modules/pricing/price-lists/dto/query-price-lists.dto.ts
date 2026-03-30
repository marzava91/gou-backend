// packages\api\src\modules\pricing\price-lists\dto\query-price-lists.dto.ts
import { IsBooleanString, IsOptional, IsString, MaxLength } from 'class-validator';

export class QueryPriceListsDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string; // búsqueda por name o code

  @IsOptional()
  @IsBooleanString()
  includeInactive?: string; // "true" para incluir isActive=false
}