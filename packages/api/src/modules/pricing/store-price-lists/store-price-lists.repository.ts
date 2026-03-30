// packages\api\src\modules\pricing\store-price-lists\store-price-lists.repository.ts
import { Injectable } from '@nestjs/common';
import { Prisma, SalesChannel, StorePriceList } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type StorePriceListCreateData = Omit<
  Prisma.StorePriceListUncheckedCreateInput,
  'tenantId' | 'createdAt'
>;

@Injectable()
export class StorePriceListsRepository {
  constructor(private prisma: PrismaService) {}

  findOne(params: { tenantId: string; storeId: string; channel: SalesChannel; priceListId: string }) {
    const { tenantId, storeId, channel, priceListId } = params;
    return this.prisma.storePriceList.findFirst({
      where: { tenantId, storeId, channel, priceListId },
    });
  }

  list(params: { tenantId: string; storeId?: string; channel?: SalesChannel; priceListId?: string }) {
    const { tenantId, storeId, channel, priceListId } = params;

    return this.prisma.storePriceList.findMany({
      where: {
        tenantId,
        ...(storeId ? { storeId } : {}),
        ...(channel ? { channel } : {}),
        ...(priceListId ? { priceListId } : {}),
      },
      orderBy: [{ storeId: 'asc' }, { channel: 'asc' }, { isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  create(tenantId: string, data: StorePriceListCreateData): Promise<StorePriceList> {
    return this.prisma.storePriceList.create({
      data: { ...data, tenantId },
    });
  }

  // Setea isDefault=false para todos los de ese store+channel (dentro de tx)
  clearDefaultForStoreChannel(tx: Prisma.TransactionClient, params: { tenantId: string; storeId: string; channel: SalesChannel }) {
    const { tenantId, storeId, channel } = params;
    return tx.storePriceList.updateMany({
      where: { tenantId, storeId, channel, isDefault: true },
      data: { isDefault: false },
    });
  }

  setDefault(tx: Prisma.TransactionClient, params: { tenantId: string; storeId: string; channel: SalesChannel; priceListId: string }) {
    const { tenantId, storeId, channel, priceListId } = params;
    // PK compuesta => updateMany por seguridad + filtro tenant
    return tx.storePriceList.updateMany({
      where: { tenantId, storeId, channel, priceListId },
      data: { isDefault: true },
    });
  }

  updateIsDefault(tenantId: string, params: { storeId: string; channel: SalesChannel; priceListId: string; isDefault: boolean }) {
    const { storeId, channel, priceListId, isDefault } = params;

    return this.prisma.storePriceList.updateMany({
      where: { tenantId, storeId, channel, priceListId },
      data: { isDefault },
    });
  }

  delete(tenantId: string, params: { storeId: string; channel: SalesChannel; priceListId: string }) {
    const { storeId, channel, priceListId } = params;
    return this.prisma.storePriceList.deleteMany({
      where: { tenantId, storeId, channel, priceListId },
    });
  }

  // Útil para “no permitir borrar el default” sin reemplazo
  findDefault(params: { tenantId: string; storeId: string; channel: SalesChannel }) {
    const { tenantId, storeId, channel } = params;
    return this.prisma.storePriceList.findFirst({
      where: { tenantId, storeId, channel, isDefault: true },
    });
  }

  // Prisma client for tx usage
  prismaClient() {
    return this.prisma;
  }
}