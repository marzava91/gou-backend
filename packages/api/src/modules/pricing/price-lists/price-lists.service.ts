// packages\api\src\modules\pricing\price-lists\price-lists.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PriceListsRepository } from './price-lists.repository';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { QueryPriceListsDto } from './dto/query-price-lists.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { PriceListResponse } from './responses/price-list.response';
import { Prisma, PriceListCode } from '@prisma/client';

function toResponse(row: any): PriceListResponse {
  return {
    id: row.id,
    tenantId: row.tenantId,
    code: row.code,
    name: row.name,
    currency: row.currency,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class PriceListsService {
  constructor(private repo: PriceListsRepository) {}

  async list(tenantId: string, q: QueryPriceListsDto) {
    const includeInactive = q.includeInactive === 'true';

    const query = q.q?.trim();
    // si q coincide con algún enum exacto, filtramos por code exacto
    const codeFilter =
      query && Object.values(PriceListCode).includes(query as any)
        ? (query as PriceListCode)
        : null;

    const rows = await this.repo.list({
      tenantId,
      includeInactive,
      q: codeFilter ? undefined : query,
    });

    const filtered = codeFilter
      ? rows.filter((r) => r.code === codeFilter)
      : rows;

    return { data: filtered.map(toResponse) };
  }

  async get(tenantId: string, id: string) {
    const row = await this.repo.findById(tenantId, id);
    if (!row) throw new NotFoundException('PriceList not found');
    return { data: toResponse(row) };
  }

  async create(tenantId: string, dto: CreatePriceListDto) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('name is required');

    try {
      const row = await this.repo.create(tenantId, {
        code: dto.code,
        name,
        currency: dto.currency ?? 'PEN',
        isActive: dto.isActive ?? true,
      });
      return { data: toResponse(row) };
    } catch (e: any) {
      // Unique tenantId+code
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'PriceList code already exists for this tenant',
        );
      }
      throw e;
    }
  }

  async update(tenantId: string, id: string, dto: UpdatePriceListDto) {
    // code NO editable
    const patch: any = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };

    try {
      const row = await this.repo.update(tenantId, id, patch);
      return { data: toResponse(row) };
    } catch (e: any) {
      if ((e?.message ?? '').includes('not found'))
        throw new NotFoundException('PriceList not found');
      throw e;
    }
  }

  async remove(tenantId: string, id: string) {
    try {
      await this.repo.delete(tenantId, id);
      return { data: { id } };
    } catch (e: any) {
      if ((e?.message ?? '').includes('not found'))
        throw new NotFoundException('PriceList not found');
      throw e;
    }
  }
}
