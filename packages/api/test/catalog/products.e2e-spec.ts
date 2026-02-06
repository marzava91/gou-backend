// ===============================
// Imports
// ===============================

import request from "supertest";
import type { Response } from "supertest";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { AppModule } from "@/app.module";
// AJUSTA ESTE IMPORT A TU PATH REAL
import { PrismaService } from "@/prisma/prisma.service";

// ===============================
// Tipos del contrato esperado
// ===============================

type CatalogResponse = {
  data: {
    items: Array<{ id: string; stock?: number | null }>;
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
};

// ===============================
// Suite de tests
// ===============================

describe("Catalog Products (offset pagination)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tenantId: string;
  let storeId: string;
  let organizationId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);

    app.useLogger(["error", "warn", "log", "debug", "verbose"]);
    app.setGlobalPrefix("v1");

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();

    // =========================
    // DISCOVERY: tenant/store reales (sin hardcode)
    // Criterio: tenant que tenga al menos 1 store ACTIVE y al menos 1 item global
    // =========================
    const tenant = await prisma.tenant.findFirst({
      where: {
        status: "ACTIVE",
        stores: { some: { status: "ACTIVE" } },
        items: { some: { storeId: null } }, // catálogo global
      },
      select: {
        id: true,
        organizationId: true,
        stores: {
          where: { status: "ACTIVE" },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!tenant?.id) {
      throw new Error(
        "E2E setup failed: no ACTIVE tenant found with at least one ACTIVE store and at least one global item (Item.storeId = null).",
      );
    }

    tenantId = tenant.id;
    organizationId = tenant.organizationId;
    storeId = tenant.stores?.[0]?.id;

    if (!storeId) {
      throw new Error(
        "E2E setup failed: tenant has no ACTIVE store to test inventory queries.",
      );
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists products (offset) without duplicates and with stable ordering", async () => {
    const seen = new Set<string>();
    const limit = 20;
    const q = ""; // evita dependencia del dataset
    const sortBy = "createdAt";
    const sortDir = "desc";

    let lastFirstId: string | null = null;

    for (let page = 1; page <= 3; page++) {
      const res: Response = await request(app.getHttpServer())
        .get("/v1/catalog/products")
        .query({
          tenantId,
          limit,
          page,
          q,
          sortBy,
          sortDir,
        })
        .expect((r) => {
          if (r.status !== 200) {
            console.log("STATUS:", r.status);
            console.log("BODY:", r.body);
            console.log("TEXT:", r.text);
          }
        })
        .expect(200);

      const body = res.body as CatalogResponse;

      expect(body).toHaveProperty("data");
      expect(Array.isArray(body.data.items)).toBe(true);

      expect(typeof body.data.total).toBe("number");
      expect(typeof body.data.totalPages).toBe("number");
      expect(typeof body.data.limit).toBe("number");
      expect(typeof body.data.page).toBe("number");

      expect(body.data.limit).toBe(limit);

      if (body.data.items.length > 0) {
        expect(body.data.page).toBe(page);
      }

      expect(body.data.items.length).toBeLessThanOrEqual(limit);

      for (const item of body.data.items) {
        expect(typeof item.id).toBe("string");

        if (seen.has(item.id)) {
          throw new Error(`Duplicate product id detected: ${item.id}`);
        }
        seen.add(item.id);
      }

      const firstId = body.data.items[0]?.id ?? null;
      if (page > 1 && body.data.items.length === limit && lastFirstId) {
        expect(firstId).not.toBe(lastFirstId);
      }
      lastFirstId = firstId;

      if (page >= body.data.totalPages) break;
    }
  });

  it('supports storeId="global" (no inventory fields should be present/used)', async () => {
    const res = await request(app.getHttpServer())
      .get("/v1/catalog/products")
      .query({
        tenantId,
        limit: 10,
        page: 1,
        storeId: "global",
        sortBy: "createdAt",
        sortDir: "desc",
      })
      .expect(200);

    const body = res.body as any;

    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data.items)).toBe(true);

    // En tu mapping: stock = null cuando NO vino inventario
    for (const item of body.data.items) {
      if ("stock" in item) {
        expect(item.stock).toBeNull();
      }
    }
  });

  it("supports storeId=<uuid> (inventory fields can be computed)", async () => {
    const res = await request(app.getHttpServer())
      .get("/v1/catalog/products")
      .query({
        tenantId,
        limit: 10,
        page: 1,
        storeId, // UUID real (discovery)
        sortBy: "createdAt",
        sortDir: "desc",
      })
      .expect(200);

    const body = res.body as any;
    expect(Array.isArray(body.data.items)).toBe(true);

    // stock puede ser number o null (depende si hay StockItem)
    for (const item of body.data.items) {
      if ("stock" in item) {
        expect(item.stock === null || typeof item.stock === "number").toBe(true);
      }
    }
  });

  it('rejects inventory sort when storeId="global"', async () => {
    await request(app.getHttpServer())
      .get("/v1/catalog/products")
      .query({
        tenantId,
        limit: 10,
        page: 1,
        storeId: "global",
        sortBy: "stockOnHand",
        sortDir: "desc",
      })
      .expect(400);
  });

  it("allows inventory sort when storeId is a real uuid", async () => {
    const res = await request(app.getHttpServer())
      .get("/v1/catalog/products")
      .query({
        tenantId,
        limit: 10,
        page: 1,
        storeId,
        sortBy: "stockOnHand",
        sortDir: "desc",
      })
      .expect(200);

    const body = res.body as any;
    expect(Array.isArray(body.data.items)).toBe(true);

    // Aquí sí es razonable esperar que stock esté computado (JOIN StockItem)
    // igual dejamos tolerancia por data rara
    for (const item of body.data.items) {
      if ("stock" in item) {
        expect(item.stock === null || typeof item.stock === "number").toBe(true);
      }
    }
  });

  it("sanity: discovered tenant belongs to discovered organizationId", async () => {
    const t = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { organizationId: true },
    });

    expect(t?.organizationId).toBe(organizationId);
  });
});


// aqui comienza la modificación.