// B) products.service.ts (business/application layer)
// “Qué significa eso para el negocio” → mapping + rules
// Aquí vive la orquestación:
// - Aplica reglas del negocio: defaults, permisos, invariantes
// - Decide qué repo llamar y cómo combinar resultados
// - Maneja casos de negocio: “si no existe, 404”, “si SKU repetido, 409”
// - Convierte/normaliza la respuesta a un contrato estable si deseas
// Regla: el service no debe saber de HTTP (no debería depender de @Query ni @Body “crudos” ni de Express).

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaProductsRepository } from './products.repository';

import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { ProductListItemResponse } from './responses/product-list-item.response';
import { ProductDetailResponse } from './responses/product-detail.response';

// Ajusta si tu negocio usa otro IGV default
const DEFAULT_TAX_RATE = 18;

// Tip: idealmente este union vive en un types shared (DTO / repo)
const INVENTORY_SORTS = ['stockOnHand', 'reorderPoint', 'lotExpiresAt'] as const;
type InventorySort = (typeof INVENTORY_SORTS)[number];

function isInventorySort(sortBy: unknown): sortBy is InventorySort {
  return typeof sortBy === 'string' && (INVENTORY_SORTS as readonly string[]).includes(sortBy);
}


@Injectable()
export class ProductsService {
  constructor(private readonly repo: PrismaProductsRepository) {}

  async list(query: QueryProductsDto): Promise<{
    items: ProductListItemResponse[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  }> {
    const {
      limit = 20,
      page = 1,
      q = "",
      sku,

      barcode,
      brandId,
      categoryId,
      bcgTag,
      visibility,

      tenantId,
      storeId, // <- si viene, habilita columnas de inventario
      sortBy,
      sortDir,
    } = query; // (si tu QueryProductsDto aún no tiene estos campos, agrégalos)

    const safeLimit = Math.min(Math.max(limit, 1), 250);
    const safePage = Math.max(page, 1);

    const inventoryStoreId: string | null | undefined =
      storeId === 'global' ? null : storeId ?? undefined;

    // Validación: sorts de inventario requieren uuid real
    if (isInventorySort(sortBy) && typeof inventoryStoreId !== 'string') {
      throw new BadRequestException(
        `Sorting by ${sortBy} requires a storeId (not 'global').`,
      );
    }

    const { items, total, totalPages } = await this.repo.getPaginatedOffset({
      page: safePage,
      limit: safeLimit,
      search: q,
      sku,

      barcode,
      brandId,
      categoryId,
      bcgTag,
      visibility,

      tenantId,
      storeId: inventoryStoreId,

      sortBy,
      sortDir,
    });

    return {
      items: items.map((i: any) => {
        // ✅ Brand y Primary Category: soporta Prisma y SQL
        const brandName =
          i.brand?.name ?? i.brandName ?? null;

        const primaryCategoryName =
          i.categories?.[0]?.category?.name ?? i.primaryCategoryName ?? null;

        // ✅ StockItem: soporta Prisma (stockItems[0]) y SQL (columns)
        const si = i.stockItems?.[0] ?? null;

        const onHand =
          si?.onHand ?? i.onHand ?? null;

        const reserved =
          si?.reserved ?? i.reserved ?? null;

        const reorderPoint =
          si?.reorderPoint ?? i.reorderPoint ?? null;

        const lotCode =
          si?.activeLotCodeSnapshot ?? i.activeLotCodeSnapshot ?? null;

        const expiresAtRaw =
          si?.activeExpiresAtSnapshot ?? i.activeExpiresAtSnapshot ?? null;

        const stock =
          onHand != null && reserved != null ? Number(onHand) - Number(reserved) : null;

        return {
          id: i.id,
          tenantId: i.tenantId,
          storeId: i.storeId ?? null,

          title: i.title,
          sku: i.sku ?? null,
          barcode: i.barcode ?? null,

          brandName,
          primaryCategoryName,

          bcgTag: i.bcgTag,

          retailPrice: null,
          stock,

          reorderPoint,
          lotCode,
          expiresAt: expiresAtRaw ? new Date(expiresAtRaw).toISOString() : null,

          itemType: i.itemType,
          visibility: i.visibility,
          isFeatured: i.isFeatured,

          sellUnit: i.sellUnit,

          taxRate: i.taxRate ?? DEFAULT_TAX_RATE,

          thumbnailUrl: i.thumbnailUrl ?? null,

          createdAt: new Date(i.createdAt).toISOString(),
          updatedAt: new Date(i.updatedAt).toISOString(),
        } satisfies ProductListItemResponse;
      }),

      total,
      page: safePage,
      totalPages,
      limit: safeLimit,
    };
  }

  async findOne(id: string): Promise<ProductDetailResponse> {
    const item = await this.repo.getById(id);
    if (!item) throw new NotFoundException("Product not found");

    return {
      id: item.id,
      tenantId: item.tenantId,
      storeId: item.storeId ?? null,

      title: item.title,
      description: item.description ?? null,
      sku: item.sku ?? null,

      itemType: item.itemType,
      visibility: item.visibility,
      isFeatured: item.isFeatured,

      sellUnit: item.sellUnit,
      isWeighable: item.isWeighable,
      taxRate: item.taxRate ?? DEFAULT_TAX_RATE,
      tracksStock: item.tracksStock,

      thumbnailUrl: item.thumbnailUrl ?? null,

      // ✅ bcgTag es 1 valor (enum/string)
      bcgTag: item.bcgTag,

      brand: item.brand
        ? {
            id: item.brand.id,
            name: item.brand.name,
            imageUrl: item.brand.imageUrl ?? null,
          }
        : null,

      categories: (item.categories ?? []).map((link) => ({
        id: link.category.id,
        name: link.category.name,
        parentId: link.category.parentId ?? null,
      })),

      documents: (item.documents ?? []).map((d) => ({
        id: d.id,
        type: d.type,
        url: d.url,
        sortOrder: d.sortOrder,
        meta: d.meta ?? null,
        createdAt: d.createdAt.toISOString(),
      })),

      prices: (item.prices ?? []).map((p) => ({
        id: p.id,
        priceListId: p.priceListId,
        amount: Number(p.amount),
        validFrom: p.validFrom.toISOString(),
        validTo: p.validTo ? p.validTo.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
      })),

      priceTiers: (item.priceTiers ?? []).map((t) => ({
        id: t.id,
        priceListId: t.priceListId,
        minQty: t.minQty,
        price: Number(t.price),
        createdAt: t.createdAt.toISOString(),
      })),

      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  async create(data: CreateProductDto): Promise<ProductDetailResponse> {
    const created = await this.repo.create(data);
    return this.findOne(created.id);
  }

  async update(id: string, data: UpdateProductDto): Promise<ProductDetailResponse> {
    const updated = await this.repo.update(id, data);
    return this.findOne(updated.id);
  }

  async delete(id: string): Promise<{ ok: true }> {
    await this.repo.delete(id);
    return { ok: true };
  }
}
