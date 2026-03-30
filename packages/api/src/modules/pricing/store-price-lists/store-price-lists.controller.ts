// packages\api\src\modules\pricing\store-price-lists\store-price-lists.controller.ts
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
import { SalesChannel } from '@prisma/client';

import { StorePriceListsService } from './store-price-lists.service';
import { CreateStorePriceListDto } from './dto/create-store-price-list.dto';
import { QueryStorePriceListsDto } from './dto/query-store-price-lists.dto';
import { UpdateStorePriceListDto } from './dto/update-store-price-list.dto';

@Controller('pricing/store-price-lists')
export class StorePriceListsController {
  constructor(private svc: StorePriceListsService) {}

  private tenantIdOrThrow(tenantId?: string) {
    if (!tenantId) throw new BadRequestException('Missing x-tenant-id header');
    return tenantId;
  }

  @Get()
  list(@Headers('x-tenant-id') tenantId: string, @Query() q: QueryStorePriceListsDto) {
    return this.svc.list(this.tenantIdOrThrow(tenantId), q);
  }

  @Get(':storeId/:channel/:priceListId')
  get(
    @Headers('x-tenant-id') tenantId: string,
    @Param('storeId') storeId: string,
    @Param('channel') channel: SalesChannel,
    @Param('priceListId') priceListId: string,
  ) {
    return this.svc.get(this.tenantIdOrThrow(tenantId), storeId, channel, priceListId);
  }

  @Post()
  create(@Headers('x-tenant-id') tenantId: string, @Body() dto: CreateStorePriceListDto) {
    return this.svc.create(this.tenantIdOrThrow(tenantId), dto);
  }

  @Patch(':storeId/:channel/:priceListId')
  update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('storeId') storeId: string,
    @Param('channel') channel: SalesChannel,
    @Param('priceListId') priceListId: string,
    @Body() dto: UpdateStorePriceListDto,
  ) {
    return this.svc.update(this.tenantIdOrThrow(tenantId), storeId, channel, priceListId, dto);
  }

  @Delete(':storeId/:channel/:priceListId')
  remove(
    @Headers('x-tenant-id') tenantId: string,
    @Param('storeId') storeId: string,
    @Param('channel') channel: SalesChannel,
    @Param('priceListId') priceListId: string,
  ) {
    return this.svc.remove(this.tenantIdOrThrow(tenantId), storeId, channel, priceListId);
  }
}