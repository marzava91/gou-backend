// packages\api\src\modules\01-identity-access\01-users\__tests__\utils\test-db.utils.ts

/**
 * What this helper does
 * ---------------------
 * Centralizes test database lifecycle helpers.
 *
 * Why this matters
 * ----------------
 * Without a shared cleanup strategy, integration tests become fragile,
 * order-dependent, and harder to maintain.
 *
 * Good indicators
 * ---------------
 * - every spec starts from a known database state
 * - cleanup order respects FK dependencies
 * - the helper is reusable across modules
 *
 * Bad indicators
 * --------------
 * - tests pass only when run in a specific order
 * - table cleanup logic is duplicated in every spec
 * - a spec leaves state behind for the next one
 */

import { PrismaService } from '../prisma/prisma.service';

export async function clearUsersModuleTables(
  prisma: PrismaService,
): Promise<void> {
  await prisma.userContactChangeRequest.deleteMany();
  await prisma.user.deleteMany();
}

export async function connectTestPrisma(): Promise<PrismaService> {
  const prisma = new PrismaService();
  await prisma.$connect();
  return prisma;
}

export async function disconnectTestPrisma(
  prisma: PrismaService,
): Promise<void> {
  await prisma.$disconnect();
}
