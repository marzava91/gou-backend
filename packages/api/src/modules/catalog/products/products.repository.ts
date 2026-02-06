// C) products.repository.ts (data access layer)
// “Cómo lo saco de la BD” → Prisma
// Aquí vive el acceso a datos:
// - Prisma queries (findMany, create, update, delete)
// - Construcción del where, include, paginación
// - No conoce HTTP, no conoce request/response
// Regla: el repository no valida DTOs; asume que el input ya viene limpio.

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, BcgTag, Visibility } from '@prisma/client';
import { buildSeekCursorWhereGeneric, buildSeekPageResult } from '../../../common/utils/pagination.util';

type GetPaginatedArgs = {
  limit?: number;
  search?: string;
  sku?: string;
  cursor?: string | null; 
  tenantId?: string;
  storeId?: string | null;
};

type SortDir = "asc" | "desc";
type SortBy =
  | "title"
  | "sku"
  | "barcode"
  | "visibility"
  | "isFeatured"
  | "createdAt"
  | "updatedAt"
  | "stockOnHand"
  | "reorderPoint"
  | "lotExpiresAt";

type GetPaginatedOffsetArgs = {
  page: number;
  limit: number;
  search?: string;
  sku?: string;

  barcode?: string;
  brandId?: string;
  categoryId?: string;
  bcgTag?: BcgTag;
  visibility?: Visibility;

  tenantId?: string;
  storeId?: string | null;

  sortBy?: SortBy;
  sortDir?: SortDir;
};

type PaginatedResult = {
  items: any[]; // o el select type si lo quieres fino
  nextCursor: string | null;
  total: number;
};


@Injectable()
export class PrismaProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getPaginated(args: GetPaginatedArgs): Promise<PaginatedResult> {
    const {
      limit = 20,
      search = "",
      sku,
      cursor = null,
      tenantId,
      storeId, // <- se usa SOLO para inventario
    } = args;

    const baseWhere: Prisma.ItemWhereInput = {};
    if (tenantId) baseWhere.tenantId = tenantId;

    // ✅ Catálogo global
    baseWhere.storeId = null;

    // ✅ Inventario por tienda
    const inventoryStoreId: string | null | undefined = storeId; 
    // undefined = omitido (sin inventario)
    // null      = global (catálogo)
    // string    = tienda (inventario)

    // helper: stockItems select condicional
    const stockItemsSelect =
      typeof inventoryStoreId === 'string'
        ? {
            where: { storeId: inventoryStoreId },
            select: {
              onHand: true,
              reserved: true,
              reorderPoint: true,
              activeLotCodeSnapshot: true,
              activeExpiresAtSnapshot: true,
            },
            take: 1,
          }
        : false;

    // =========================
    // SKU exacto
    // =========================
    if (sku) {
      const whereSku: Prisma.ItemWhereInput = { ...baseWhere, sku };

      const total = await this.prisma.item.count({ where: whereSku });

      const rows = await this.prisma.item.findMany({
        where: whereSku,
        take: limit + 1,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          tenantId: true,
          storeId: true,

          title: true,
          sku: true,
          barcode: true,

          itemType: true,
          visibility: true,
          isFeatured: true,

          sellUnit: true,
          taxRate: true,

          thumbnailUrl: true,
          bcgTag: true,

          createdAt: true,
          updatedAt: true,

          brand: { select: { name: true } },

          // ✅ categoría primaria para la columna CATEGORY
          categories: {
            where: { isPrimary: true },
            select: { category: { select: { name: true } } },
            take: 1,
          },

          // ✅ inventario (si vino storeId)
          stockItems: stockItemsSelect,
        },
      });

      const { data, nextCursor } = buildSeekPageResult(rows, limit);
      return { items: data, nextCursor, total };
    }

    // =========================
    // Search
    // =========================
    const trimmed = search.trim();

    const whereBase: Prisma.ItemWhereInput = trimmed
      ? {
          ...baseWhere,
          OR: [
            { title: { contains: trimmed, mode: "insensitive" } },
            { sku: { contains: trimmed, mode: "insensitive" } },
            { barcode: { contains: trimmed, mode: "insensitive" } },
            { id: { contains: trimmed, mode: "insensitive" } },
          ],
        }
      : baseWhere;

    const total = await this.prisma.item.count({ where: whereBase });

    const cursorWhere = buildSeekCursorWhereGeneric(cursor) as Prisma.ItemWhereInput | undefined;

    const rows = await this.prisma.item.findMany({
      where: cursorWhere ? { AND: [whereBase, cursorWhere] } : whereBase,
      take: limit + 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        tenantId: true,
        storeId: true,

        title: true,
        sku: true,
        barcode: true,

        itemType: true,
        visibility: true,
        isFeatured: true,

        sellUnit: true,
        taxRate: true,

        thumbnailUrl: true,
        bcgTag: true,

        createdAt: true,
        updatedAt: true,

        brand: { select: { name: true } },

        categories: {
          where: { isPrimary: true },
          select: { category: { select: { name: true } } },
          take: 1,
        },

        stockItems: stockItemsSelect,
      },
    });

    const { data, nextCursor } = buildSeekPageResult(rows, limit);
    return { items: data, nextCursor, total };
  }


  async getPaginatedOffset(args: GetPaginatedOffsetArgs) {
    const {
      page,
      limit,
      search = "",
      sku,

      barcode,
      brandId,
      categoryId,
      bcgTag,
      visibility,

      tenantId,
      storeId, // <- este lo usamos SOLO para inventario
      sortBy,
      sortDir,
    } = args;

    const baseWhere: Prisma.ItemWhereInput = {};
    if (tenantId) baseWhere.tenantId = tenantId;

    // ✅ CATÁLOGO GLOBAL:
    baseWhere.storeId = null;

    // ✅ INVENTARIO POR TIENDA (siempre desde StockItem)
    const inventoryStoreId: string | null | undefined = storeId;

    const trimmed = search.trim();

    const where: Prisma.ItemWhereInput = {
      ...baseWhere,

      ...(sku ? { sku } : {}),
      ...(barcode ? { barcode } : {}),
      ...(brandId ? { brandId } : {}),
      ...(bcgTag ? { bcgTag } : {}),
      ...(visibility ? { visibility } : {}),
      ...(categoryId ? { categories: { some: { categoryId } } } : {}),

      ...(trimmed && !sku && !barcode
        ? {
            OR: [
              { title: { contains: trimmed, mode: "insensitive" } },
              { sku: { contains: trimmed, mode: "insensitive" } },
              { barcode: { contains: trimmed, mode: "insensitive" } },
              { id: { contains: trimmed, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 250);
    const skip = (safePage - 1) * safeLimit;

    const dir: Prisma.SortOrder = (sortDir ?? "desc") === "asc" ? "asc" : "desc";

    // ✅ Sort fields que dependen de inventario
    const INVENTORY_SORTS = new Set<SortBy>([
      "stockOnHand",
      "reorderPoint",
      "lotExpiresAt",
    ]);

    const wantsInventorySort = !!sortBy && INVENTORY_SORTS.has(sortBy);
    const isInventorySort = wantsInventorySort && typeof storeId === 'string';

    // Si piden sort inventario sin storeId => ideal: error en service.
    // Aquí mantenemos tu comportamiento (no rompemos): fallback a createdAt desc.
    // if (!inventoryStoreId && wantsInventorySort) { ... }

    if (isInventorySort) {
      const invStoreId = storeId as string;

      // 1) Construye ORDER BY específico
      const orderExpr =
        sortBy === "stockOnHand"
          ? (dir === "asc"
              ? Prisma.sql`(si."onHand" - si."reserved") ASC`
              : Prisma.sql`(si."onHand" - si."reserved") DESC`)
          : sortBy === "reorderPoint"
          ? (dir === "asc"
              ? Prisma.sql`si."reorderPoint" ASC NULLS LAST`
              : Prisma.sql`si."reorderPoint" DESC NULLS LAST`)
          : (dir === "asc"
              ? Prisma.sql`si."activeExpiresAtSnapshot" ASC NULLS LAST`
              : Prisma.sql`si."activeExpiresAtSnapshot" DESC NULLS LAST`);

      // 2) Filtros SQL (reusa tus criterios)
      const filters: Prisma.Sql[] = [
        Prisma.sql`i."storeId" IS NULL`, // catálogo global
        Prisma.sql`si."storeId" = ${invStoreId}`,
      ];

      // ✅ FIX: tenantId solo si viene (si no, te quedas en 0 filas)
      if (tenantId) filters.push(Prisma.sql`i."tenantId" = ${tenantId}`);
      if (sku) filters.push(Prisma.sql`i."sku" = ${sku}`);
      if (barcode) filters.push(Prisma.sql`i."barcode" = ${barcode}`);
      if (brandId) filters.push(Prisma.sql`i."brandId" = ${brandId}`);
      if (bcgTag) filters.push(Prisma.sql`i."bcgTag" = ${bcgTag}`);
      if (visibility) filters.push(Prisma.sql`i."visibility" = ${visibility}`);

      if (categoryId) {
        filters.push(Prisma.sql`
          EXISTS (
            SELECT 1
            FROM "ItemCategory" ic
            WHERE ic."itemId" = i."id"
              AND ic."categoryId" = ${categoryId}
          )
        `);
      }

      if (trimmed && !sku && !barcode) {
        const like = `%${trimmed}%`;
        filters.push(Prisma.sql`
          (
            i."title" ILIKE ${like}
            OR i."sku" ILIKE ${like}
            OR i."barcode" ILIKE ${like}
            OR i."id" ILIKE ${like}
          )
        `);
      }

      const whereSql =
        filters.length === 0
          ? Prisma.sql`TRUE`
          : filters.slice(1).reduce(
              (acc, f) => Prisma.sql`${acc} AND ${f}`,
              filters[0],
            );

      // 3) Total (SQL)
      const totalRows = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint as count
        FROM "Item" i
        JOIN "StockItem" si
          ON si."itemId" = i."id" AND si."storeId" = ${invStoreId}
        WHERE ${whereSql}
      `;
      const total = Number(totalRows?.[0]?.count ?? 0n);

      // 4) Page rows (SQL)
      const rows = await this.prisma.$queryRaw<any[]>`
        SELECT
          i."id",
          i."tenantId",
          i."storeId",
          i."title",
          i."sku",
          i."barcode",
          i."bcgTag",
          i."itemType",
          i."visibility",
          i."isFeatured",
          i."sellUnit",
          i."taxRate",
          i."thumbnailUrl",
          i."createdAt",
          i."updatedAt",

          -- ✅ Brand (1)
          b."name" as "brandName",

          -- ✅ Primary category (1)
          pc."primaryCategoryName" as "primaryCategoryName",

          -- ✅ StockItem vigente (1)
          si."onHand",
          si."reserved",
          si."reorderPoint",
          si."activeLotCodeSnapshot",
          si."activeExpiresAtSnapshot"

        FROM "Item" i

        JOIN "StockItem" si
          ON si."itemId" = i."id" AND si."storeId" = ${invStoreId}

        LEFT JOIN "Brand" b
          ON b."id" = i."brandId"

        LEFT JOIN LATERAL (
          SELECT c."name" as "primaryCategoryName"
          FROM "ItemCategory" ic
          JOIN "Category" c ON c."id" = ic."categoryId"
          WHERE ic."itemId" = i."id" AND ic."isPrimary" = true
          LIMIT 1
        ) pc ON true

        WHERE ${whereSql}
        ORDER BY ${orderExpr}, i."id" DESC
        OFFSET ${skip}
        LIMIT ${safeLimit}
      `;

      const totalPages = total > 0 ? Math.ceil(total / safeLimit) : 0;

      return {
        items: rows,
        total,
        page: safePage,
        limit: safeLimit,
        totalPages,
      };
    }

    // ✅ FIX: el count Prisma SOLO corre en la rama Prisma (antes estaba arriba)
    const total = await this.prisma.item.count({ where });

    const orderBy: Prisma.ItemOrderByWithRelationInput[] = (() => {
      switch (sortBy) {
        case "title":
          return [{ title: dir }, { id: "desc" }];
        case "sku":
          return [{ sku: dir }, { id: "desc" }];
        case "barcode":
          return [{ barcode: dir }, { id: "desc" }];
        case "visibility":
          return [{ visibility: dir }, { createdAt: "desc" }, { id: "desc" }];
        case "isFeatured":
          return [{ isFeatured: dir }, { createdAt: "desc" }, { id: "desc" }];
        case "updatedAt":
          return [{ updatedAt: dir }, { id: "desc" }];
        case "createdAt":
        default:
          return [{ createdAt: dir }, { id: "desc" }];
      }
    })();

    const items = await this.prisma.item.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy,
      select: {
        id: true,
        tenantId: true,
        storeId: true,

        title: true,
        sku: true,
        barcode: true,
        bcgTag: true,

        itemType: true,
        visibility: true,
        isFeatured: true,
        sellUnit: true,
        taxRate: true,

        thumbnailUrl: true,
        createdAt: true,
        updatedAt: true,

        brand: { select: { name: true } },

        categories: {
          where: { isPrimary: true },
          select: { category: { select: { name: true } } },
          take: 1,
        },

        stockItems: typeof inventoryStoreId === 'string'
          ? {
              where: { storeId: inventoryStoreId },
              select: {
                onHand: true,
                reserved: true,
                reorderPoint: true,
                activeLotCodeSnapshot: true,
                activeExpiresAtSnapshot: true,
              },
              take: 1,
            }
          : false,
      },
    });

    const totalPages = total > 0 ? Math.ceil(total / safeLimit) : 0;

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
    };
  }


  async getById(id: string) {
    return this.prisma.item.findUnique({
      where: { id },
      include: {
        categories: { include: { category: true } },
        brand: true,
        documents: true,
        prices: true,
        priceTiers: true,
      },
    });
  }

  async create(data: any) {
    // mínimo viable: crea Item base
    return this.prisma.item.create({
      data: {
        tenantId: data.tenantId,
        storeId: data.storeId ?? null,
        title: data.title,
        description: data.description ?? null,
        sku: data.sku ?? null,
        itemType: data.itemType ?? 'RETAIL',
        visibility: data.visibility ?? 'VISIBLE',
        isFeatured: data.isFeatured ?? false,
        sellUnit: data.sellUnit ?? 'UNIT',
        isWeighable: data.isWeighable ?? false,
        taxRate: data.taxRate ?? 18,
        tracksStock: data.tracksStock ?? true,
        thumbnailUrl: data.thumbnailUrl ?? null,
        bcgTag: data.bcgTag ?? 'UNCLASSIFIED',
        brandId: data.brandId ?? null,

        // categorías (si viene array categoryIds)
        categories: Array.isArray(data.categoryIds)
          ? {
              create: data.categoryIds.map((categoryId: string) => ({
                categoryId,
              })),
            }
          : undefined,
      },
      include: {
        categories: true,
        brand: true,
      },
    });
  }

  async update(id: string, data: any) {
    // update parcial
    return this.prisma.item.update({
      where: { id },
      data: {
        title: data.title ?? undefined,
        description: data.description ?? undefined,
        sku: data.sku ?? undefined,
        itemType: data.itemType ?? undefined,
        visibility: data.visibility ?? undefined,
        isFeatured: data.isFeatured ?? undefined,
        sellUnit: data.sellUnit ?? undefined,
        isWeighable: data.isWeighable ?? undefined,
        taxRate: data.taxRate ?? undefined,
        tracksStock: data.tracksStock ?? undefined,
        thumbnailUrl: data.thumbnailUrl ?? undefined,
        bcgTag: data.bcgTag ?? undefined,
        brandId: data.brandId ?? undefined,
      },
      include: {
        categories: { include: { category: true } },
        brand: true,
        documents: true,
      },
    });
  }

  async delete(id: string) {
    await this.prisma.item.delete({ where: { id } });
    return { ok: true };
  }
}
