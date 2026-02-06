import "dotenv/config";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET ?? "items";

const TENANT_CODE = process.env.TENANT_CODE ?? "miji";
const IMAGES_DIR =
  process.env.IMAGES_DIR ??
  path.join(process.cwd(), "prisma", "seed_data", "images");

// Cliente Supabase (server-side)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function guessContentType(ext: string) {
  const e = ext.toLowerCase();
  if (e === ".png") return "image/png";
  if (e === ".webp") return "image/webp";
  return "image/jpeg";
}

function skuFromFilename(filename: string) {
  // "DIG-123.jpg" -> "DIG-123"
  return path.parse(filename).name.trim();
}

async function main() {
  // Validaciones básicas
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
  }
  if (!fs.existsSync(IMAGES_DIR)) {
    throw new Error(`IMAGES_DIR no existe: ${IMAGES_DIR}`);
  }

  // Resolver tenantId por code (ajusta si tu schema difiere)
  const tenant = await prisma.tenant.findUnique({
    where: { code: TENANT_CODE },
    select: { id: true },
  });
  if (!tenant) throw new Error(`Tenant no encontrado por code=${TENANT_CODE}`);

  const files = fs
    .readdirSync(IMAGES_DIR)
    .filter((f) => !f.startsWith("."));

  console.log(`Found ${files.length} files in ${IMAGES_DIR}`);

  let ok = 0;
  let missingItem = 0;
  let failed = 0;

  for (const f of files) {
    const abs = path.join(IMAGES_DIR, f);
    const stat = fs.statSync(abs);
    if (!stat.isFile()) continue;

    const ext = path.extname(f).toLowerCase();
    const ref = skuFromFilename(f); // "10"
    const sku = `DIG-${ref}`;       // "DIG-10"

    // Busca item por tenant + sku (requiere unique compuesto tenantId+sku)
    const item = await prisma.item.findUnique({
      where: { tenantId_sku: { tenantId: tenant.id, sku } },
      select: { id: true },
    });

    if (!item) {
      console.log(`⚠️  Item no encontrado para sku=${sku} (archivo=${f})`);
      missingItem++;
      continue;
    }

    // Ruta dentro del bucket (sin prefijar el nombre del bucket)
    const storagePath = `${TENANT_CODE}/original/${sku}${ext}`;
    const contentType = guessContentType(ext);

    try {
      const bytes = fs.readFileSync(abs);

      const { error: upErr } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(storagePath, bytes, {
          upsert: true,
          contentType,
          cacheControl: "3600",
        });

      if (upErr) throw upErr;

      const { data } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(storagePath);

      const publicUrl = data.publicUrl;

      await prisma.item.update({
        where: { id: item.id },
        data: { thumbnailUrl: publicUrl }, // cambia a imageUrl si tu schema usa otro campo
      });

      ok++;
      if (ok % 50 === 0) console.log(`✅ progress ok=${ok}/${files.length}`);
    } catch (e: any) {
      failed++;
      console.error(`❌ Failed file=${f} sku=${sku}`, e?.message ?? e);
    }
  }

  console.log({ ok, missingItem, failed });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
