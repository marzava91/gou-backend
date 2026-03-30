// packages\api\src\modules\pricing\item-prices\item-prices.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma, ItemPrice } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type ItemPriceCreateData = Omit<
  Prisma.ItemPriceUncheckedCreateInput,
  'tenantId' | 'id' | 'createdAt' | 'updatedAt'
>;

@Injectable()
export class ItemPricesRepository {
  constructor(private prisma: PrismaService) {}

  findById(tenantId: string, id: string) {
    return this.prisma.itemPrice.findFirst({ where: { tenantId, id } });
  }

  list(params: {
    tenantId: string;
    priceListId?: string;
    itemId?: string;
    variantId?: string;
    activeAt?: Date | null;
    includeExpired?: boolean;
  }) {
    const { tenantId, priceListId, itemId, variantId, activeAt, includeExpired } = params;

    const baseWhere: Prisma.ItemPriceWhereInput = {
      tenantId,
      ...(priceListId ? { priceListId } : {}),
      ...(itemId ? { itemId } : {}),
      ...(variantId !== undefined ? { variantId } : {}),
    };

    // Si viene activeAt, filtramos “vigentes a esa fecha”
    const whereWithActiveAt: Prisma.ItemPriceWhereInput =
      activeAt
        ? {
            ...baseWhere,
            validFrom: { lte: activeAt },
            OR: [{ validTo: null }, { validTo: { gt: activeAt } }],
          }
        : baseWhere;

    // Si NO viene activeAt y NO quieren expirados, mantenemos los “no vencidos”
    const whereFinal: Prisma.ItemPriceWhereInput =
      !activeAt && !includeExpired
        ? {
            ...whereWithActiveAt,
            OR: [{ validTo: null }, { validTo: { gt: new Date() } }],
          }
        : whereWithActiveAt;

    return this.prisma.itemPrice.findMany({
      where: whereFinal,
      orderBy: [{ priceListId: 'asc' }, { itemId: 'asc' }, { validFrom: 'desc' }],
    });
  }

  // Para prevenir solapamientos antes de crear/actualizar
  findOverlapping(params: {
    tenantId: string;
    priceListId: string;
    itemId: string;
    variantId?: string | null;
    newFrom: Date;
    newTo: Date | null;
    excludeId?: string;
  }) {
    const { tenantId, priceListId, itemId, variantId, newFrom, newTo, excludeId } = params;

    // overlap si:
    // existing.validFrom < newTo (o newTo es null => siempre)
    // y (existing.validTo es null o existing.validTo > newFrom)
    const where: Prisma.ItemPriceWhereInput = {
      tenantId,
      priceListId,
      itemId,
      variantId: variantId ?? null,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
      AND: [
        ...(newTo
          ? [{ validFrom: { lt: newTo } }]
          : []),
        {
          OR: [{ validTo: null }, { validTo: { gt: newFrom } }],
        },
      ],
    };

    return this.prisma.itemPrice.findFirst({ where });
  }

  create(tenantId: string, data: ItemPriceCreateData): Promise<ItemPrice> {
    return this.prisma.itemPrice.create({ data: { ...data, tenantId } });
  }

  async update(tenantId: string, id: string, data: Prisma.ItemPriceUpdateInput): Promise<ItemPrice> {
    const res = await this.prisma.itemPrice.updateMany({ where: { tenantId, id }, data });
    if (res.count === 0) throw new Error('ItemPrice not found');

    const updated = await this.prisma.itemPrice.findFirst({ where: { tenantId, id } });
    return updated!;
  }

  async delete(tenantId: string, id: string) {
    // OJO: ItemPriceTier tiene FK onDelete: Cascade => se borra todo el pricing escalonado
    const res = await this.prisma.itemPrice.deleteMany({ where: { tenantId, id } });
    if (res.count === 0) throw new Error('ItemPrice not found');
    return { ok: true };
  }
}