// packages\api\src\modules\catalog\categories\categories.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { MoveCategoryDto } from './dto/move-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private svc: CategoriesService) {}

  // GET /v1/categories?parentId=...   (si no envías parentId => roots)
  // GET /v1/categories?q=leche       (typeahead)
  @Get()
  list(@Req() req: any, @Query() q: QueryCategoriesDto) {
    const tenantId = req.user?.tenantId ?? req.headers['x-tenant-id']; // ajusta a tu auth
    return this.svc.list(tenantId, q);
  }

  // GET /v1/categories/tree?includeInactive=true
  @Get('tree')
  tree(@Req() req: any, @Query('includeInactive') includeInactive?: string) {
    const tenantId = req.user?.tenantId ?? req.headers['x-tenant-id'];
    return this.svc.tree(tenantId, includeInactive === 'true');
  }

  // GET /v1/categories/:id
  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId ?? req.headers['x-tenant-id'];
    return this.svc.get(tenantId, id);
  }

  // POST /v1/categories
  @Post()
  create(@Req() req: any, @Body() dto: CreateCategoryDto) {
    const tenantId = req.user?.tenantId ?? req.headers['x-tenant-id'];
    return this.svc.create(tenantId, dto);
  }

  // PATCH /v1/categories/:id
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const tenantId = req.user?.tenantId ?? req.headers['x-tenant-id'];
    return this.svc.update(tenantId, id, dto);
  }

  // PATCH /v1/categories/:id/move
  @Patch(':id/move')
  move(@Req() req: any, @Param('id') id: string, @Body() dto: MoveCategoryDto) {
    const tenantId = req.user?.tenantId ?? req.headers['x-tenant-id'];
    return this.svc.move(tenantId, id, dto);
  }

  // PATCH /v1/categories/:id/active
  @Patch(':id/active')
  toggle(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    const tenantId = req.user?.tenantId ?? req.headers['x-tenant-id'];
    return this.svc.toggleActive(tenantId, id, body.isActive);
  }

  // DELETE /v1/categories/:id
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId ?? req.headers['x-tenant-id'];
    return this.svc.remove(tenantId, id);
  }
}
