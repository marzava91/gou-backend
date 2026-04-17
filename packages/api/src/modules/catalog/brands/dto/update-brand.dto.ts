// packages\api\src\modules\catalog\brands\dto\update-brand.dto.ts
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
