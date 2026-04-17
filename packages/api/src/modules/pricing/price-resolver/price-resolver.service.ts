// packages\api\src\modules\pricing\price-resolver\price-resolver.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SalesChannel } from '@prisma/client';
import { PriceResolverRepository } from './price-resolver.repostery';
import { ResolvePriceDto } from './dto/resolve-price.dto';
import { ResolvePriceResponse } from './responses/resolve-price.response';

function parseISO(v?: string, field = 'at'): Date | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime()))
    throw new BadRequestException(`${field} must be ISO8601`);
  return d;
}

function toStr(d: any): string {
  return d?.toString?.() ?? String(d);
}

@Injectable()
export class PriceResolverService {
  constructor(private repo: PriceResolverRepository) {}

  private pickTier(tiers: any[], qty: number) {
    // tiers vienen ordenados por minQty DESC
    for (const t of tiers ?? []) {
      const minOk = qty >= t.minQty;
      const maxOk = t.maxQty == null ? true : qty <= t.maxQty;
      if (minOk && maxOk) return t;
    }
    return null;
  }

  private async findPriceInList(params: {
    tenantId: string;
    priceListId: string;
    itemId: string;
    variantId?: string | null;
    at: Date;
    qty: number;
    allowVariantFallbackToNull?: boolean;
  }) {
    const {
      tenantId,
      priceListId,
      itemId,
      variantId,
      at,
      qty,
      allowVariantFallbackToNull,
    } = params;

    // 1) buscar exacto por variantId (o null si no hay)
    const exact = await this.repo.findActiveItemPrice({
      tenantId,
      priceListId,
      itemId,
      variantId: variantId ?? null,
      at,
    });

    let row = exact;

    // 2) opcional: si pidieron variantId y no existe, caer a variantId=null
    if (!row && allowVariantFallbackToNull && variantId) {
      row = await this.repo.findActiveItemPriceVariantFallback({
        tenantId,
        priceListId,
        itemId,
        at,
      });
    }

    if (!row) return null;

    const tier = this.pickTier(row.tiers ?? [], qty);
    const unitPrice = tier
      ? (row.tiers.find((x: any) => x.id === tier.id)?.unitPrice ??
        tier.unitPrice)
      : row.amount;

    return {
      row,
      tier: tier ? { ...tier } : null,
      unitPrice: unitPrice,
    };
  }

  async resolve(
    tenantId: string,
    dto: ResolvePriceDto,
  ): Promise<{ data: ResolvePriceResponse }> {
    const storeId = dto.storeId?.trim();
    const itemId = dto.itemId?.trim();
    const variantId = dto.variantId?.trim();
    if (!storeId) throw new BadRequestException('storeId is required');
    if (!itemId) throw new BadRequestException('itemId is required');
    if (!dto.channel) throw new BadRequestException('channel is required');
    if (!Number.isInteger(dto.qty) || dto.qty < 1)
      throw new BadRequestException('qty must be >= 1');

    const at = parseISO(dto.at, 'at') ?? new Date();

    // 1) determinar priceListId principal
    let resolvedFrom: ResolvePriceResponse['resolvedFrom'];
    let priceListId: string | null = null;

    if (dto.priceListId) {
      priceListId = dto.priceListId;
      resolvedFrom = 'EXPLICIT_PRICE_LIST';
    } else {
      const def = await this.repo.findDefaultPriceList({
        tenantId,
        storeId,
        channel: dto.channel,
      });
      if (!def?.priceListId)
        throw new NotFoundException(
          'No default PriceList for this store/channel',
        );
      priceListId = def.priceListId;
      resolvedFrom = 'STORE_DEFAULT';
    }

    // 2) buscar precio en lista principal
    let found = await this.findPriceInList({
      tenantId,
      priceListId,
      itemId,
      variantId: variantId ?? null,
      at,
      qty: dto.qty,
      allowVariantFallbackToNull: true,
    });

    // 3) fallback a otra lista (campañas)
    if (!found && dto.fallbackPriceListId) {
      found = await this.findPriceInList({
        tenantId,
        priceListId: dto.fallbackPriceListId,
        itemId,
        variantId: variantId ?? null,
        at,
        qty: dto.qty,
        allowVariantFallbackToNull: true,
      });

      if (found) {
        resolvedFrom = 'FALLBACK';
        priceListId = dto.fallbackPriceListId;
      }
    }

    if (!found) {
      throw new NotFoundException(
        'No active price found for this item/variant in the selected PriceList(s)',
      );
    }

    const baseAmount = found.row.amount;
    const unit = found.unitPrice;

    const unitDec = new Prisma.Decimal(toStr(unit));
    const extDec = unitDec.mul(new Prisma.Decimal(dto.qty));

    const resp: ResolvePriceResponse = {
      tenantId,
      storeId,
      channel: dto.channel as SalesChannel,
      itemId,
      variantId: variantId ?? null,
      qty: dto.qty,
      at: at.toISOString(),

      unitPrice: unitDec.toFixed(4),
      extendedPrice: extDec.toFixed(4),

      resolvedFrom,
      priceListId,

      itemPriceId: found.row.id,
      baseAmount: new Prisma.Decimal(toStr(baseAmount)).toFixed(4),
      tierApplied: !!found.tier,
      tier: found.tier
        ? {
            id: found.tier.id,
            minQty: found.tier.minQty,
            maxQty: found.tier.maxQty ?? null,
            unitPrice: new Prisma.Decimal(toStr(found.tier.unitPrice)).toFixed(
              4,
            ),
          }
        : null,
    };

    return { data: resp };
  }
}
