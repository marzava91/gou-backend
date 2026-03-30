// packages\api\src\modules\pricing\price-lists\dto\update-price-list.dto.ts
import { IsBoolean, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class UpdatePriceListDto {
  // code NO se actualiza (recomendado). Si quieres permitirlo, lo hablamos luego.
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}