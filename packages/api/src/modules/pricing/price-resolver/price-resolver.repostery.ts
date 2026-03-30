// packages\api\src\modules\pricing\price-resolver\price-resolver.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma, SalesChannel } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PriceResolverRepository {
  constructor(private prisma: PrismaService) {}

  findDefaultPriceList(params: { tenantId: string; storeId: string; channel: SalesChannel }) {
    const { tenantId, storeId, channel } = params;

    return this.prisma.storePriceList.findFirst({
      where: { tenantId, storeId, channel, isDefault: true },
      select: { priceListId: true },
    });
  }

  // Busca ItemPrice vigente a "at" para (priceListId, itemId, variantId)
  // Incluye tiers ordenados por minQty desc para calzar rápido.
  findActiveItemPrice(params: {
    tenantId: string;
    priceListId: string;
    itemId: string;
    variantId?: string | null;
    at: Date;
  }) {
    const { tenantId, priceListId, itemId, variantId, at } = params;

    return this.prisma.itemPrice.findFirst({
      where: {
        tenantId,
        priceListId,
        itemId,
        variantId: variantId ?? null,
        validFrom: { lte: at },
        OR: [{ validTo: null }, { validTo: { gt: at } }],
      },
      orderBy: [{ validFrom: 'desc' }],
      include: {
        tiers: {
          orderBy: [{ minQty: 'desc' }],
        },
      },
    });
  }

  // si quieres resolver para item sin variant (fallback)
  // ej: si no existe price para variant, probar null
  findActiveItemPriceVariantFallback(params: {
    tenantId: string;
    priceListId: string;
    itemId: string;
    at: Date;
  }) {
    const { tenantId, priceListId, itemId, at } = params;

    return this.prisma.itemPrice.findFirst({
      where: {
        tenantId,
        priceListId,
        itemId,
        variantId: null,
        validFrom: { lte: at },
        OR: [{ validTo: null }, { validTo: { gt: at } }],
      },
      orderBy: [{ validFrom: 'desc' }],
      include: { tiers: { orderBy: [{ minQty: 'desc' }] } },
    });
  }

  // helper para Decimal math
  dec(v: string) {
    return new Prisma.Decimal(v);
  }
}