// packages\api\src\modules\pricing\store-price-lists\dto\update-store-price-list.dto.ts
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateStorePriceListDto {
  // channel/storeId/priceListId NO se actualizan (PK compuesta)
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}