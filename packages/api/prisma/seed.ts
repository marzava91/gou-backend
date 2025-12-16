import { PrismaClient, TenantPlan, ScopeLevel } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1️⃣ Tenant
  const tenant = await prisma.tenant.upsert({
    where: { code: "miji" },
    update: {},
    create: {
      code: "miji",
      name: "MIJI Markets",
      plan: TenantPlan.PRO,
    },
  });

  // 2️⃣ Store
  const store = await prisma.store.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: "miji-trujillo-01",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      code: "miji-trujillo-01",
      name: "MIJI Trujillo",
      addressText: "Trujillo, Perú",
    },
  });

  // 3️⃣ Roles base
  const roles = [
    { code: "owner", scopeLevel: ScopeLevel.TENANT },
    { code: "cashier", scopeLevel: ScopeLevel.STORE },
    { code: "shopper", scopeLevel: ScopeLevel.STORE },
  ];

  const roleRecords = await Promise.all(
    roles.map((r) =>
      prisma.role.upsert({
        where: { code: r.code },
        update: {},
        create: r,
      })
    )
  );

  // 4️⃣ Usuario admin (sin auth real aún)
  const user = await prisma.user.upsert({
    where: { email: "admin@miji.dev" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@miji.dev",
      firstName: "Admin",
      lastName: "MIJI",
    },
  });

  // 5️⃣ Asignar rol owner (storeId = null)
  const ownerRole = roleRecords.find((r) => r.code === "owner")!;

  const existing = await prisma.userRole.findFirst({
  where: {
      userId: user.id,
      roleId: ownerRole.id,
      tenantId: tenant.id,
      storeId: null,
  },
  });

  if (!existing) {
  await prisma.userRole.create({
      data: {
      userId: user.id,
      roleId: ownerRole.id,
      tenantId: tenant.id,
      storeId: null, // explícito
      },
  });
  }

  console.log("✅ Seed completed");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
