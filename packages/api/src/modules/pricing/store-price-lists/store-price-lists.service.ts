// packages\api\src\modules\pricing\store-price-lists\store-price-lists.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SalesChannel } from '@prisma/client';
import { StorePriceListsRepository } from './store-price-lists.repository';
import { CreateStorePriceListDto } from './dto/create-store-price-list.dto';
import { QueryStorePriceListsDto } from './dto/query-store-price-lists.dto';
import { UpdateStorePriceListDto } from './dto/update-store-price-list.dto';
import { StorePriceListResponse } from './responses/store-price-list.response';

function toResponse(row: any): StorePriceListResponse {
  return {
    tenantId: row.tenantId,
    storeId: row.storeId,
    priceListId: row.priceListId,
    channel: row.channel,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class StorePriceListsService {
  constructor(private repo: StorePriceListsRepository) {}

  async list(tenantId: string, q: QueryStorePriceListsDto) {
    const rows = await this.repo.list({
      tenantId,
      storeId: q.storeId,
      channel: q.channel,
      priceListId: q.priceListId,
    });

    return { data: rows.map(toResponse) };
  }

  async get(
    tenantId: string,
    storeId: string,
    channel: SalesChannel,
    priceListId: string,
  ) {
    const row = await this.repo.findOne({
      tenantId,
      storeId,
      channel,
      priceListId,
    });
    if (!row) throw new NotFoundException('StorePriceList not found');
    return { data: toResponse(row) };
  }

  async create(tenantId: string, dto: CreateStorePriceListDto) {
    const storeId = dto.storeId?.trim();
    const priceListId = dto.priceListId?.trim();
    if (!storeId) throw new BadRequestException('storeId is required');
    if (!priceListId) throw new BadRequestException('priceListId is required');

    const channel = dto.channel ?? SalesChannel.POS;
    const isDefault = dto.isDefault ?? false;

    try {
      // Si isDefault=true => garantizamos “solo 1 default por store+channel”
      if (isDefault) {
        const prisma = this.repo.prismaClient();
        const row = await prisma.$transaction(async (tx) => {
          await this.repo.clearDefaultForStoreChannel(tx, {
            tenantId,
            storeId,
            channel,
          });

          return tx.storePriceList.create({
            data: { tenantId, storeId, priceListId, channel, isDefault: true },
          });
        });

        return { data: toResponse(row) };
      }

      const row = await this.repo.create(tenantId, {
        storeId,
        priceListId,
        channel,
        isDefault,
      });
      return { data: toResponse(row) };
    } catch (e: any) {
      // PK compuesta storeId+priceListId+channel (y además tenantId en where)
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'StorePriceList already exists for this store/channel/priceList',
        );
      }
      throw e;
    }
  }

  async update(
    tenantId: string,
    storeId: string,
    channel: SalesChannel,
    priceListId: string,
    dto: UpdateStorePriceListDto,
  ) {
    const exists = await this.repo.findOne({
      tenantId,
      storeId,
      channel,
      priceListId,
    });
    if (!exists) throw new NotFoundException('StorePriceList not found');

    if (dto.isDefault === undefined) {
      return { data: toResponse(exists) };
    }

    const prisma = this.repo.prismaClient();

    // Si quieren marcar default=true => clear + set default en tx
    if (dto.isDefault === true) {
      const updated = await prisma.$transaction(async (tx) => {
        await this.repo.clearDefaultForStoreChannel(tx, {
          tenantId,
          storeId,
          channel,
        });

        const res = await this.repo.setDefault(tx, {
          tenantId,
          storeId,
          channel,
          priceListId,
        });
        if (res.count === 0) throw new Error('StorePriceList not found');

        return tx.storePriceList.findFirst({
          where: { tenantId, storeId, channel, priceListId },
        });
      });

      return { data: toResponse(updated!) };
    }

    // dto.isDefault === false
    // decisión de negocio: ¿permitimos que un canal se quede sin default?
    // Yo lo permitiría solo si vas a setear otro default en el mismo request.
    // Por ahora: permitimos (simple).
    const res = await this.repo.updateIsDefault(tenantId, {
      storeId,
      channel,
      priceListId,
      isDefault: false,
    });
    if (res.count === 0)
      throw new NotFoundException('StorePriceList not found');

    const row = await this.repo.findOne({
      tenantId,
      storeId,
      channel,
      priceListId,
    });
    return { data: toResponse(row!) };
  }

  async remove(
    tenantId: string,
    storeId: string,
    channel: SalesChannel,
    priceListId: string,
  ) {
    // regla opcional: no permitir borrar el default sin reemplazo
    const row = await this.repo.findOne({
      tenantId,
      storeId,
      channel,
      priceListId,
    });
    if (!row) throw new NotFoundException('StorePriceList not found');

    // Si quieres bloquear:
    // if (row.isDefault) throw new BadRequestException('Cannot delete default StorePriceList. Set another default first.');

    const res = await this.repo.delete(tenantId, {
      storeId,
      channel,
      priceListId,
    });
    if (res.count === 0)
      throw new NotFoundException('StorePriceList not found');

    return { data: { storeId, channel, priceListId } };
  }
}
