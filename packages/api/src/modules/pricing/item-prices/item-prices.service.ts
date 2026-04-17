// packages\api\src\modules\pricing\item-prices\item-prices.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ItemPricesRepository } from './item-prices.repository';
import { CreateItemPriceDto } from './dto/create-item-price.dto';
import { QueryItemPricesDto } from './dto/query-item-prices.dto';
import { UpdateItemPriceDto } from './dto/update-item-price.dto';
import { ItemPriceResponse } from './responses/item-price.response';

function toResponse(row: any): ItemPriceResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    priceListId: row.priceListId,
    itemId: row.itemId,
    variantId: row.variantId ?? null,
    amount: row.amount?.toString?.() ?? String(row.amount),
    validFrom: row.validFrom.toISOString(),
    validTo: row.validTo ? row.validTo.toISOString() : null,
    createdBy: row.createdBy ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseISOOrThrow(v?: string, fieldName = 'date'): Date | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime()))
    throw new BadRequestException(`${fieldName} must be ISO8601`);
  return d;
}

@Injectable()
export class ItemPricesService {
  constructor(private repo: ItemPricesRepository) {}

  async list(tenantId: string, q: QueryItemPricesDto) {
    const includeExpired = q.includeExpired === 'true';
    const activeAt = parseISOOrThrow(q.activeAt, 'activeAt');

    const rows = await this.repo.list({
      tenantId,
      priceListId: q.priceListId,
      itemId: q.itemId,
      variantId: q.variantId,
      activeAt,
      includeExpired,
    });

    return { data: rows.map(toResponse) };
  }

  async get(tenantId: string, id: string) {
    const row = await this.repo.findById(tenantId, id);
    if (!row) throw new NotFoundException('ItemPrice not found');
    return { data: toResponse(row) };
  }

  async create(tenantId: string, dto: CreateItemPriceDto) {
    const amount = dto.amount?.trim();
    if (!amount) throw new BadRequestException('amount is required');

    const validFrom = parseISOOrThrow(dto.validFrom, 'validFrom') ?? new Date();
    const validTo = parseISOOrThrow(dto.validTo, 'validTo');

    if (validTo && validTo <= validFrom) {
      throw new BadRequestException('validTo must be greater than validFrom');
    }

    // Anti-solapamiento por (tenant + priceList + item + variant)
    const overlap = await this.repo.findOverlapping({
      tenantId,
      priceListId: dto.priceListId,
      itemId: dto.itemId,
      variantId: dto.variantId ?? null,
      newFrom: validFrom,
      newTo: validTo ?? null,
    });
    if (overlap)
      throw new ConflictException(
        'Overlapping ItemPrice validity range for this item/variant/priceList',
      );

    try {
      const row = await this.repo.create(tenantId, {
        priceListId: dto.priceListId,
        itemId: dto.itemId,
        variantId: dto.variantId ?? null,
        amount: new Prisma.Decimal(amount),
        validFrom,
        validTo: validTo ?? null,
        createdBy: dto.createdBy ?? null,
      });

      return { data: toResponse(row) };
    } catch (e: any) {
      throw e;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateItemPriceDto) {
    // necesitamos el registro actual para validar overlaps si cambian fechas
    const current = await this.repo.findById(tenantId, id);
    if (!current) throw new NotFoundException('ItemPrice not found');

    const nextValidFrom = dto.validFrom
      ? parseISOOrThrow(dto.validFrom, 'validFrom')!
      : current.validFrom;
    const nextValidTo =
      dto.validTo !== undefined
        ? parseISOOrThrow(dto.validTo, 'validTo')
        : current.validTo;

    if (nextValidTo && nextValidTo <= nextValidFrom) {
      throw new BadRequestException('validTo must be greater than validFrom');
    }

    // Si cambian fechas (o aunque no cambien), validamos solapamiento excluyendo el mismo id
    const overlap = await this.repo.findOverlapping({
      tenantId,
      priceListId: current.priceListId,
      itemId: current.itemId,
      variantId: current.variantId ?? null,
      newFrom: nextValidFrom,
      newTo: nextValidTo ?? null,
      excludeId: id,
    });
    if (overlap)
      throw new ConflictException(
        'Overlapping ItemPrice validity range for this item/variant/priceList',
      );

    const patch: any = {
      ...(dto.amount !== undefined
        ? { amount: new Prisma.Decimal(dto.amount.trim()) }
        : {}),
      ...(dto.validFrom !== undefined ? { validFrom: nextValidFrom } : {}),
      ...(dto.validTo !== undefined ? { validTo: nextValidTo ?? null } : {}),
      ...(dto.createdBy !== undefined
        ? { createdBy: dto.createdBy ?? null }
        : {}),
    };

    try {
      const row = await this.repo.update(tenantId, id, patch);
      return { data: toResponse(row) };
    } catch (e: any) {
      if ((e?.message ?? '').includes('not found'))
        throw new NotFoundException('ItemPrice not found');
      throw e;
    }
  }

  async remove(tenantId: string, id: string) {
    try {
      await this.repo.delete(tenantId, id);
      return { data: { id } };
    } catch (e: any) {
      if ((e?.message ?? '').includes('not found'))
        throw new NotFoundException('ItemPrice not found');
      throw e;
    }
  }
}
