// packages\api\src\modules\pricing\price-resolver\price-resolver.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
} from '@nestjs/common';
import { PriceResolverService } from './price-resolver.service';
import { ResolvePriceDto } from './dto/resolve-price.dto';

@Controller('pricing/price-resolver')
export class PriceResolverController {
  constructor(private svc: PriceResolverService) {}

  private tenantIdOrThrow(tenantId?: string) {
    if (!tenantId) throw new BadRequestException('Missing x-tenant-id header');
    return tenantId;
  }

  @Post('resolve')
  resolve(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: ResolvePriceDto,
  ) {
    return this.svc.resolve(this.tenantIdOrThrow(tenantId), dto);
  }
}
