// packages/api/src/integrations/__tests__/identity-access/users.integration.spec.ts
import { PrismaClient } from '@prisma/client';
import { cleanIdentityAccessTestData } from '../../setup/test-db-cleaner';

const prisma = new PrismaClient();

jest.setTimeout(30000);

describe('Users Integration (REAL DB)', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await cleanIdentityAccessTestData(prisma);
  });

  afterAll(async () => {
    await cleanIdentityAccessTestData(prisma);
    await prisma.$disconnect();
  });

  it('should create and read user in real database', async () => {
    const email = `integration-test-${Date.now()}@example.com`;

    const created = await prisma.user.create({
      data: {
        firstName: 'Integration',
        lastName: 'Test',
        displayName: 'Integration Test',
        primaryEmail: email,
      },
    });

    expect(created.id).toBeDefined();

    const found = await prisma.user.findUnique({
      where: { id: created.id },
    });

    expect(found).not.toBeNull();
    expect(found?.primaryEmail).toBe(email);
  });
});