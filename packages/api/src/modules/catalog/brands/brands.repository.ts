// packages\api\src\modules\catalog\brands\brands.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma, Brand } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueryBrandsDto } from './dto/query-brands.dto';

type BrandCreateData = Omit<
  Prisma.BrandUncheckedCreateInput,
  'tenantId' | 'id' | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class BrandsRepository {
  constructor(private prisma: PrismaService) {}

  async findMany(tenantId: string, q: QueryBrandsDto) {
    const where: Prisma.BrandWhereInput = {
      tenantId,
      ...(q.isFeatured !== undefined ? { isFeatured: q.isFeatured } : {}),
      ...(q.q ? { name: { contains: q.q, mode: 'insensitive' } } : {}),
    };

    const orderBy: Prisma.BrandOrderByWithRelationInput =
      q.orderBy === 'createdAt'
        ? { createdAt: q.orderDir }
        : { name: q.orderDir };

    const rows = await this.prisma.brand.findMany({
      where,
      orderBy,
      take: q.limit ?? 50,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });

    const nextCursor = rows.length ? rows[rows.length - 1]!.id : null;
    return { rows, nextCursor };
  }

  async findById(tenantId: string, id: string): Promise<Brand | null> {
    return this.prisma.brand.findFirst({ where: { id, tenantId } });
  }

  // ✅ clave: UncheckedCreateInput te deja pasar tenantId directo
  async create(tenantId: string, data: BrandCreateData): Promise<Brand> {
    return this.prisma.brand.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.BrandUpdateInput,
  ): Promise<Brand> {
    const res = await this.prisma.brand.updateMany({
      where: { id, tenantId },
      data,
    });

    if (res.count === 0) {
      throw new Error('Brand not found'); // o lanza NotFoundException en service
    }

    // devolver el registro actualizado
    const updated = await this.prisma.brand.findFirst({
      where: { id, tenantId },
    });

    return updated!;
  }

  async delete(tenantId: string, id: string): Promise<Brand> {
    const existing = await this.prisma.brand.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new Error('Brand not found');
    }

    await this.prisma.brand.deleteMany({
      where: { id, tenantId },
    });

    return existing;
  }
}
