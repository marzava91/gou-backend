// packages\api\src\modules\catalog\categories\dto\query-categories.dto.ts
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class QueryCategoriesDto {
  @IsOptional()
  @IsString()
  parentId?: string; // si no viene => raíces

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeInactive?: boolean;

  @IsOptional()
  @IsString()
  q?: string; // typeahead search
}