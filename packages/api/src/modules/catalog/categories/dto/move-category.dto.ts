// packages\api\src\modules\catalog\categories\dto\move-category.dto.ts
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class MoveCategoryDto {
  @IsOptional()
  @IsString()
  newParentId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
