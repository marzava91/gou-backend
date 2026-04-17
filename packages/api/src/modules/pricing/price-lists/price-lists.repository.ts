// packages\api\src\modules\pricing\price-lists\price-lists.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma, PriceList, PriceListCode } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type PriceListCreateData = Omit<
  Prisma.PriceListUncheckedCreateInput,
  'tenantId' | 'id' | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class PriceListsRepository {
  constructor(private prisma: PrismaService) {}

  findById(tenantId: string, id: string) {
    return this.prisma.priceList.findFirst({ where: { tenantId, id } });
  }

  findByCode(tenantId: string, code: PriceListCode) {
    return this.prisma.priceList.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
  }

  list(params: { tenantId: string; q?: string; includeInactive?: boolean }) {
    const { tenantId, q, includeInactive } = params;

    return this.prisma.priceList.findMany({
      where: {
        tenantId,
        ...(includeInactive ? {} : { isActive: true }),
        ...(q?.trim()
          ? {
              OR: [
                { name: { contains: q.trim(), mode: 'insensitive' } },
                // Prisma enum filter: equals, in. Para "contains" en enum no aplica.
                // Si quieres buscar por code, lo hacemos con equals cuando q matchee.
              ],
            }
          : {}),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  create(tenantId: string, data: PriceListCreateData): Promise<PriceList> {
    return this.prisma.priceList.create({
      data: { ...data, tenantId },
    });
  }

  async update(
    tenantId: string,
    id: string,
    data: Prisma.PriceListUpdateInput,
  ): Promise<PriceList> {
    const res = await this.prisma.priceList.updateMany({
      where: { tenantId, id },
      data,
    });

    if (res.count === 0) throw new Error('PriceList not found');

    const updated = await this.prisma.priceList.findFirst({
      where: { tenantId, id },
    });

    return updated!;
  }

  async delete(tenantId: string, id: string) {
    // OJO: si hay StorePriceList o ItemPrice referenciando, tu FK onDelete: Cascade
    // significa que se van a borrar también. Si NO quieres eso, cambia el schema.
    const res = await this.prisma.priceList.deleteMany({
      where: { tenantId, id },
    });
    if (res.count === 0) throw new Error('PriceList not found');
    return { ok: true };
  }
}
