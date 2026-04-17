// packages\api\src\modules\pricing\price-lists\price-lists.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { PriceListsService } from './price-lists.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { QueryPriceListsDto } from './dto/query-price-lists.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';

@Controller('pricing/price-lists')
export class PriceListsController {
  constructor(private svc: PriceListsService) {}

  private tenantIdOrThrow(tenantId?: string) {
    if (!tenantId) throw new BadRequestException('Missing x-tenant-id header');
    return tenantId;
  }

  @Get()
  list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() q: QueryPriceListsDto,
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
    @Body() dto: CreatePriceListDto,
  ) {
    return this.svc.create(this.tenantIdOrThrow(tenantId), dto);
  }

  @Patch(':id')
  update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePriceListDto,
  ) {
    return this.svc.update(this.tenantIdOrThrow(tenantId), id, dto);
  }

  @Delete(':id')
  remove(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.svc.remove(this.tenantIdOrThrow(tenantId), id);
  }
}
