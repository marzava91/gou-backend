// packages\api\src\modules\catalog\brands\brands.service.ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BrandsRepository } from './brands.repository';
import { CreateBrandDto } from './dto/create-brand.dto';
import { QueryBrandsDto } from './dto/query-brands.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandListResponse, BrandResponse } from './responses/brand.response';

function toResponse(row: any): BrandResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    imageUrl: row.imageUrl ?? null,
    isFeatured: row.isFeatured,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class BrandsService {
  constructor(private repo: BrandsRepository) {}

  async list(tenantId: string, q: QueryBrandsDto): Promise<BrandListResponse> {
    const { rows, nextCursor } = await this.repo.findMany(tenantId, q);
    return { data: rows.map(toResponse), nextCursor };
  }

  async get(tenantId: string, id: string): Promise<{ data: BrandResponse }> {
    const row = await this.repo.findById(tenantId, id);
    if (!row) throw new NotFoundException('Brand not found');
    return { data: toResponse(row) };
  }

  async create(tenantId: string, dto: CreateBrandDto): Promise<{ data: BrandResponse }> {
    try {
      const row = await this.repo.create(tenantId, {
        name: dto.name.trim(),
        imageUrl: dto.imageUrl ?? null,
        isFeatured: dto.isFeatured ?? false,
      });
      return { data: toResponse(row) };
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // unique([tenantId,name])
        throw new ConflictException('Brand name already exists in this tenant');
      }
      throw e;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateBrandDto): Promise<{ data: BrandResponse }> {
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Brand not found');

    try {
      const row = await this.repo.update(tenantId, id, {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
      });
      return { data: toResponse(row) };
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Brand name already exists in this tenant');
      }
      throw e;
    }
  }

  async remove(tenantId: string, id: string): Promise<{ ok: true }> {
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Brand not found');

    // si quieres bloquear borrado cuando tiene items: aquí es donde lo validas
    // ejemplo (si un día haces check):
    // if (await this.repo.countItemsForBrand(tenantId, id) > 0) throw new BadRequestException('Brand has items');

    await this.repo.delete(tenantId, id);
    return { ok: true };
  }
}