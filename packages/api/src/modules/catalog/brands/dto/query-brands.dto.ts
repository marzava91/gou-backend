// packages\api\src\modules\catalog\brands\dto\query-brands.dto.ts
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryBrandsDto {
  @IsOptional()
  @IsString()
  q?: string; // search by name

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsIn(['name', 'createdAt'])
  orderBy?: 'name' | 'createdAt' = 'name';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDir?: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  cursor?: string; // brand.id
}