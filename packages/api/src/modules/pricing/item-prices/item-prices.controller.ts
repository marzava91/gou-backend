// packages\api\src\modules\pricing\item-prices\item-prices.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ItemPricesService } from './item-prices.service';
import { CreateItemPriceDto } from './dto/create-item-price.dto';
import { QueryItemPricesDto } from './dto/query-item-prices.dto';
import { UpdateItemPriceDto } from './dto/update-item-price.dto';

@Controller('pricing/item-prices')
export class ItemPricesController {
  constructor(private svc: ItemPricesService) {}

  private tenantIdOrThrow(tenantId?: string) {
    if (!tenantId) throw new BadRequestException('Missing x-tenant-id header');
    return tenantId;
  }

  @Get()
  list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() q: QueryItemPricesDto,
  ) {
    return this.svc.list(this.tenantIdOrThrow(tenantId), q);
  }

  @Get(':id')
  get(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.svc.get(this.tenantIdOrThrow(tenantId), id);
  }

  @Post()
  create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateItemPriceDto,
  ) {
    return this.svc.create(this.tenantIdOrThrow(tenantId), dto);
  }

  @Patch(':id')
  update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateItemPriceDto,
  ) {
    return this.svc.update(this.tenantIdOrThrow(tenantId), id, dto);
  }

  @Delete(':id')
  remove(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.svc.remove(this.tenantIdOrThrow(tenantId), id);
  }
}
