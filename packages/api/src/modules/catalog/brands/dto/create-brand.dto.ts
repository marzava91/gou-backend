// packages\api\src\modules\catalog\brands\dto\create-brand.dto.ts
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';

export class CreateBrandDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
