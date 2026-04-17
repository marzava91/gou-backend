// packages\api\src\modules\catalog\categories\categories.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Category } from '@prisma/client';

type CategoryCreateData = Omit<
  Prisma.CategoryUncheckedCreateInput,
  'tenantId' | 'id' | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class CategoriesRepository {
  constructor(private prisma: PrismaService) {}

  findById(tenantId: string, id: string) {
    return this.prisma.category.findFirst({
      where: { tenantId, id },
    });
  }

  listByParent(params: {
    tenantId: string;
    parentId: string | null;
    includeInactive?: boolean;
  }) {
    const { tenantId, parentId, includeInactive } = params;

    return this.prisma.category.findMany({
      where: {
        tenantId,
        parentId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  // Para UI "Expandir todo" (árbol completo). Ojo: si son miles, paginar o lazy-load.
  listAll(params: { tenantId: string; includeInactive?: boolean }) {
    const { tenantId, includeInactive } = params;

    return this.prisma.category.findMany({
      where: {
        tenantId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  // Typeahead: por name y/o path (si lo guardas)
  search(params: {
    tenantId: string;
    q: string;
    includeInactive?: boolean;
    take?: number;
  }) {
    const { tenantId, q, includeInactive, take = 20 } = params;

    return this.prisma.category.findMany({
      where: {
        tenantId,
        ...(includeInactive ? {} : { isActive: true }),
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          // Si tienes path en schema:
          { path: { contains: q, mode: 'insensitive' } as any },
        ],
      },
      orderBy: [{ name: 'asc' }],
      take,
    });
  }

  create(tenantId: string, data: CategoryCreateData) {
    return this.prisma.category.create({
      data: { ...data, tenantId },
    });
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.CategoryUpdateInput,
  ): Promise<Category> {
    const res = await this.prisma.category.updateMany({
      where: { tenantId, id },
      data,
    });

    if (res.count === 0) throw new Error('Category not found');

    const updated = await this.prisma.category.findFirst({
      where: { tenantId, id },
    });

    return updated!;
  }

  async delete(tenantId: string, id: string) {
    // (opcional) primero lees para devolverlo / validar
    const existing = await this.prisma.category.findFirst({
      where: { tenantId, id },
      select: { id: true },
    });
    if (!existing) throw new Error('Category not found');

    await this.prisma.category.deleteMany({
      where: { tenantId, id },
    });

    return { ok: true };
  }

  // útil para validar duplicados (mismo nivel)
  existsSameLevel(params: {
    tenantId: string;
    parentId: string | null;
    name: string;
    excludeId?: string;
  }) {
    const { tenantId, parentId, name, excludeId } = params;
    return this.prisma.category.findFirst({
      where: {
        tenantId,
        parentId,
        name,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  listChildrenIds(tenantId: string, parentId: string) {
    return this.prisma.category.findMany({
      where: { tenantId, parentId },
      select: { id: true },
    });
  }
}
