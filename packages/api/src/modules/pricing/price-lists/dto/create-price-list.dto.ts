//packages\api\src\modules\pricing\price-lists\dto\create-price-list.dto.ts
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

// OJO: importa el enum real desde Prisma
import { PriceListCode } from '@prisma/client';

export class CreatePriceListDto {
  @IsEnum(PriceListCode)
  code!: PriceListCode; // obligatorio e irrepetible por tenant (unique tenantId+code)

  @IsString()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  @Matches(/^[A-Z]{3}$/)
  currency?: string; // default "PEN" en DB

  @IsOptional()
  @IsBoolean()
  isActive?: boolean; // default true en DB
}
