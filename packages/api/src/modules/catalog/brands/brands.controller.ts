// packages\api\src\modules\catalog\brands\brands.controller.ts
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
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { QueryBrandsDto } from './dto/query-brands.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(private svc: BrandsService) {}

  private tenantIdOrThrow(tenantId?: string) {
    if (!tenantId) throw new Error('Missing x-tenant-id header'); // si prefieres: BadRequestException
    return tenantId;
  }

  @Get()
  list(@Headers('x-tenant-id') tenantId: string, @Query() q: QueryBrandsDto) {
    return this.svc.list(this.tenantIdOrThrow(tenantId), q);
  }

  @Get(':id')
  get(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.svc.get(this.tenantIdOrThrow(tenantId), id);
  }

  @Post()
  create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateBrandDto,
  ) {
    return this.svc.create(this.tenantIdOrThrow(tenantId), dto);
  }

  @Patch(':id')
  update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.svc.update(this.tenantIdOrThrow(tenantId), id, dto);
  }

  @Delete(':id')
  remove(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.svc.remove(this.tenantIdOrThrow(tenantId), id);
  }
}
