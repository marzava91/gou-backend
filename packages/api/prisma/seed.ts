/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import { PrismaClient, Prisma, PriceListCode, ItemType, Visibility, SellUnit } from "@prisma/client";

/**
 * =========================
 * Prisma client (con logs útiles)
 * =========================
 */
const prisma = new PrismaClient({
  log: ["info", "warn", "error"],
});

/**
 * =========================
 * Config
 * =========================
 */
const SEED_MODE = (process.env.SEED_MODE ?? "base").toLowerCase(); // base | dummy
const DATA_DIR = path.join(__dirname, "seed_data");

const FILE_PRODUCTS = path.join(DATA_DIR, "productos digitales.csv");
const FILE_BRANDS = path.join(DATA_DIR, "marcas dummy.csv");
const FILE_CATEGORIES = path.join(DATA_DIR, "categorias dummy.csv"); // opcional

/**
 * =========================
 * Helpers: timing + progress
 * =========================
 */
function now() {
  return Date.now();
}
function fmtMs(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}
async function withTiming<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = now();
  console.log(`▶️  ${label}...`);
  try {
    const res = await fn();
    console.log(`✅ ${label} (${fmtMs(now() - t0)})`);
    return res;
  } catch (e) {
    console.log(`❌ ${label} (${fmtMs(now() - t0)})`);
    throw e;
  }
}

/**
 * =========================
 * CSV parser (simple + robust)
 *  - separator: ';'
 *  - supports quoted fields with ; inside
 * =========================
 */
function stripBom(s: string) {
  return s.replace(/^\uFEFF/, "");
}

function parseCsv(content: string, delimiter = ";"): Array<Record<string, string>> {
  const text = stripBom(content).replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (c === '"') {
      // escaped quotes ""
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && c === delimiter) {
      row.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && c === "\n") {
      row.push(field);
      field = "";
      const isEmpty = row.every((v) => v.trim() === "");
      if (!isEmpty) rows.push(row);
      row = [];
      continue;
    }

    field += c;
  }

  // last field
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    const isEmpty = row.every((v) => v.trim() === "");
    if (!isEmpty) rows.push(row);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => stripBom(h).trim());
  const data = rows.slice(1);

  return data.map((cols) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cols[idx] ?? "").trim();
    });
    return obj;
  });
}

function readCsvFile(filePath: string): Array<Record<string, string>> {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf8");
  return parseCsv(content, ";");
}

function toNumberSafe(raw: string): number | null {
  if (!raw) return null;
  const normalized = raw.replace(",", ".").trim();
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * =========================
 * Seed Base (tenant/store mínimo)
 * =========================
 */
async function seedBase() {
  return await withTiming("Seeding base (Tenant/Store/PriceList)", async () => {
    const tenant = await prisma.tenant.upsert({
      where: { code: "miji" },
      update: { name: "MIJI Markets", plan: "PRO" },
      create: { code: "miji", name: "MIJI Markets", plan: "PRO", status: "ACTIVE" },
    });

    const store = await prisma.store.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "TRU-001" } },
      update: { name: "MIJI - Trujillo" },
      create: {
        tenantId: tenant.id,
        code: "TRU-001",
        name: "MIJI - Trujillo",
        status: "ACTIVE",
        addressText: "Trujillo",
      },
    });

    const retail =
      (await prisma.priceList.findFirst({
        where: { tenantId: tenant.id, storeId: null, code: PriceListCode.RETAIL },
      })) ??
      (await prisma.priceList.create({
        data: {
          tenantId: tenant.id,
          storeId: null,
          code: PriceListCode.RETAIL,
          name: "RETAIL",
          currency: "PEN",
          isActive: true,
        },
      }));

    console.log("✅ Base ready:", { tenantId: tenant.id, storeId: store.id, retailPriceListId: retail.id });
    return { tenant, store, retail };
  });
}

/**
 * =========================
 * Dummy Import (Opción B)
 * =========================
 */
type ProductRow = {
  ref: string;
  descripcion: string;
  igv: number;
  precio: number;
  categoryChild: string;
  categoryParent: string;
};

function normalizeHeaderMap(row: Record<string, string>): ProductRow {
  const get = (keys: string[]) => {
    for (const k of keys) {
      const found = Object.keys(row).find((h) => h.trim().toLowerCase() === k.toLowerCase());
      if (found) return row[found];
    }
    return "";
  };

  const ref = get(["Ref.", "Ref", "ref"]);
  const descripcion = get(["Descripción", "Descripcion", "descripcion"]);
  const igvRaw = get(["IGV", "igv"]);
  const precioRaw = get(["precio", "Precio", "price"]);
  const child = get(["category", "categoría", "categoria"]);
  const parent = get(["categoria padre", "categoría padre", "category parent", "parent"]);

  const igv = toNumberSafe(igvRaw) ?? 18;
  const precio = toNumberSafe(precioRaw) ?? 0;

  return {
    ref: ref.trim(),
    descripcion: descripcion.trim(),
    igv: Math.round(igv),
    precio,
    categoryChild: child.trim(),
    categoryParent: parent.trim(),
  };
}

/**
 * Brands: bulk insert (rápido)
 */
async function importBrands(tenantId: string) {
  const rows = readCsvFile(FILE_BRANDS);
  if (rows.length === 0) {
    console.log("ℹ️ marcas dummy.csv no encontrado o vacío; se omite import de marcas.");
    return [];
  }

  const names = rows
    .map((r) => (r["name"] ?? r["Name"] ?? "").trim())
    .filter((n) => n.length > 0);

  const unique = Array.from(new Set(names));

  await withTiming(`Importing brands (unique=${unique.length})`, async () => {
    await prisma.brand.createMany({
      data: unique.map((name) => ({ tenantId, name })),
      skipDuplicates: true,
    });
  });

  const all = await prisma.brand.findMany({ where: { tenantId }, select: { id: true, name: true } });
  console.log(`🏷️ Brands in DB: ${all.length}`);
  return all;
}

function pickBrandId(description: string, brands: Array<{ id: string; name: string }>): string | null {
  const d = description.toLowerCase();
  let best: { id: string; name: string } | null = null;

  for (const b of brands) {
    const bn = b.name.toLowerCase();
    if (!bn || bn.length < 2) continue;
    if (d.includes(bn)) {
      if (!best || bn.length > best.name.length) best = b;
    }
  }
  return best?.id ?? null;
}

/**
 * Categories: bulk parents + bulk children + build childMap (parentName|||childName -> id)
 */
async function ensureCategoriesFromProducts(tenantId: string, products: ProductRow[]) {
  const parentNames = new Set<string>();
  const childPairs = new Set<string>(); // parentName|||childName

  for (const p of products) {
    if (p.categoryParent) parentNames.add(p.categoryParent);
    if (p.categoryParent && p.categoryChild) childPairs.add(`${p.categoryParent}|||${p.categoryChild}`);
  }

  console.log(`🗂️ Ensuring categories. Parents: ${parentNames.size}, child pairs: ${childPairs.size}`);

  const parents = Array.from(parentNames);

  await withTiming(`Upserting parent categories (bulk=${parents.length})`, async () => {
    await prisma.category.createMany({
      data: parents.map((name) => ({
        tenantId,
        name,
        parentId: null,
        isActive: true,
      })),
      skipDuplicates: true,
    });
  });

  const parentRows = await prisma.category.findMany({
    where: { tenantId, parentId: null },
    select: { id: true, name: true },
  });

  const parentMap = new Map<string, string>(); // name -> id
  for (const p of parentRows) parentMap.set(p.name, p.id);

  const childData = Array.from(childPairs)
    .map((key) => {
      const [parentName, childName] = key.split("|||");
      const parentId = parentMap.get(parentName);
      if (!parentId) return null;
      return { tenantId, name: childName, parentId, isActive: true };
    })
    .filter(Boolean) as Array<{ tenantId: string; name: string; parentId: string; isActive: boolean }>;

  await withTiming(`Upserting child categories (bulk=${childData.length})`, async () => {
    await prisma.category.createMany({
      data: childData,
      skipDuplicates: true,
    });
  });

  // Rebuild child map from DB (para obtener ids)
  const allChildren = await prisma.category.findMany({
    where: { tenantId, parentId: { not: null } },
    select: { id: true, name: true, parentId: true },
  });

  const parentIdToName = new Map<string, string>();
  for (const [name, id] of parentMap.entries()) parentIdToName.set(id, name);

  const childMap = new Map<string, string>(); // parentName|||childName -> id
  for (const c of allChildren) {
    const parentName = parentIdToName.get(c.parentId!);
    if (!parentName) continue;
    childMap.set(`${parentName}|||${c.name}`, c.id);
  }

  return { parentMap, childMap };
}

/**
 * Process ONE product (used by batch and fallback)
 */
async function upsertOneProduct(tx: Prisma.TransactionClient, p: ProductRow, params: {
  tenantId: string;
  storeId: string;
  retailPriceListId: string;
  brands: Array<{ id: string; name: string }>;
  childCategoryIdByPair: Map<string, string>;
}) {
  const sku = `DIG-${p.ref}`;
  const brandId = pickBrandId(p.descripcion, params.brands);

  const catKey = `${p.categoryParent}|||${p.categoryChild}`;
  const categoryId = params.childCategoryIdByPair.get(catKey) ?? null;

  const item = await tx.item.upsert({
    where: { tenantId_sku: { tenantId: params.tenantId, sku } },
    update: {
      title: p.descripcion,
      taxRate: p.igv,
      brandId,
    },
    create: {
      tenantId: params.tenantId,
      title: p.descripcion,
      description: null,
      sku,
      itemType: ItemType.RETAIL,
      visibility: Visibility.VISIBLE,
      isFeatured: false,
      sellUnit: SellUnit.UNIT,
      isWeighable: false,
      taxRate: p.igv,
      tracksStock: true,
      thumbnailUrl: null,
      tags: [],
      brandId,
    },
    select: { id: true },
  });

  // Link Item -> Category
  if (categoryId) {
    await tx.itemCategory.upsert({
      where: { itemId_categoryId: { itemId: item.id, categoryId } },
      update: {},
      create: { itemId: item.id, categoryId },
    });
  }

  // Stock por store
  await tx.stockItem.upsert({
    where: { tenantId_storeId_itemId: { tenantId: params.tenantId, storeId: params.storeId, itemId: item.id } },
    update: { onHand: 10, reserved: 0 },
    create: { tenantId: params.tenantId, storeId: params.storeId, itemId: item.id, onHand: 10, reserved: 0 },
  });

  // Precio RETAIL: delete+create para idempotencia simple
  await tx.itemPrice.deleteMany({
    where: { tenantId: params.tenantId, itemId: item.id, priceListId: params.retailPriceListId },
  });

  await tx.itemPrice.create({
    data: {
      tenantId: params.tenantId,
      itemId: item.id,
      priceListId: params.retailPriceListId,
      amount: new Prisma.Decimal(p.precio.toFixed(4)),
    },
  });
}

/**
 * Products -> Items with batch progress + fallback
 */
async function importProductsAsItems(params: {
  tenantId: string;
  storeId: string;
  retailPriceListId: string;
  brands: Array<{ id: string; name: string }>;
  childCategoryIdByPair: Map<string, string>;
}) {
  const raw = readCsvFile(FILE_PRODUCTS);
  if (raw.length === 0) throw new Error("productos digitales.csv no encontrado o vacío.");

  const products: ProductRow[] = raw
    .map((r) => normalizeHeaderMap(r))
    .filter((p) => p.ref && p.descripcion && p.categoryParent && p.categoryChild);

  console.log(`📦 Importing items from products: ${products.length}`);

  const batches = chunk(products, 200);
  const tAll = now();
  let processed = 0;

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    const t0 = now();
    console.log(`  - Batch ${bi + 1}/${batches.length} (${batch.length} items)`);

    try {
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < batch.length; i++) {
          const p = batch[i];

          // progreso dentro del batch
          if ((i + 1) % 25 === 0) {
            console.log(`    • batch item ${i + 1}/${batch.length} (global ${processed + i + 1}/${products.length})`);
          }

          await upsertOneProduct(tx, p, params);
        }
      });

      processed += batch.length;
      console.log(
        `    ✅ Batch done in ${fmtMs(now() - t0)} | total ${processed}/${products.length} | elapsed ${fmtMs(now() - tAll)}`
      );
    } catch (e) {
      console.error(`    ❌ Batch ${bi + 1} failed after ${fmtMs(now() - t0)} (processed=${processed})`);
      console.error(e);

      // fallback: item por item para aislar fila
      console.log("    🔎 Falling back to per-item processing to isolate the failing row...");

      for (let i = 0; i < batch.length; i++) {
        const p = batch[i];
        try {
          await prisma.$transaction(async (tx) => {
            await upsertOneProduct(tx, p, params);
          });
          processed += 1;

          if (processed % 25 === 0) {
            console.log(`    • fallback progress: ${processed}/${products.length}`);
          }
        } catch (err) {
          console.error("    💥 Failed row identified:");
          console.error({
            ref: p.ref,
            descripcion: p.descripcion,
            igv: p.igv,
            precio: p.precio,
            categoryParent: p.categoryParent,
            categoryChild: p.categoryChild,
          });
          throw err;
        }
      }
    }
  }

  console.log(`✅ Items import completed. Total time: ${fmtMs(now() - tAll)}`);
}

async function seedDummy(tenantId: string, storeId: string, retailPriceListId: string) {
  console.log("🌱 Seeding dummy catalog from CSV...");
  console.log(`📄 Files:`, {
    brands: fs.existsSync(FILE_BRANDS) ? FILE_BRANDS : "NOT_FOUND",
    products: fs.existsSync(FILE_PRODUCTS) ? FILE_PRODUCTS : "NOT_FOUND",
    categories: fs.existsSync(FILE_CATEGORIES) ? FILE_CATEGORIES : "OPTIONAL/NOT_USED",
  });

  const brands = await importBrands(tenantId);

  const rawProducts = readCsvFile(FILE_PRODUCTS);
  const products: ProductRow[] = rawProducts
    .map((r) => normalizeHeaderMap(r))
    .filter((p) => p.ref && p.descripcion && p.categoryParent && p.categoryChild);

  const { childMap } = await ensureCategoriesFromProducts(tenantId, products);

  await importProductsAsItems({
    tenantId,
    storeId,
    retailPriceListId,
    brands,
    childCategoryIdByPair: childMap,
  });

  console.log("✅ Dummy catalog ready.");
}

/**
 * =========================
 * Main
 * =========================
 */
async function main() {
  console.log(`🚀 Seed start. Mode=${SEED_MODE}`);
  console.log(`📌 Tip: para seed usa direct connection: $env:DATABASE_URL=$env:DIRECT_URL`);

  const { tenant, store, retail } = await seedBase();

  if (SEED_MODE === "dummy") {
    await seedDummy(tenant.id, store.id, retail.id);
  } else {
    console.log("ℹ️ SEED_MODE=base (no dummy import).");
  }
}

main()
  .then(() => console.log("✅ Seed completed"))
  .catch((e) => {
    console.error("❌ Seed failed", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
