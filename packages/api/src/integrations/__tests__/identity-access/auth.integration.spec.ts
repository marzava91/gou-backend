// packages/api/src/integrations/__tests__/identity-access/auth.integration.spec.ts
import {
  PrismaClient,
  AuthProvider,
  AuthSessionStatus,
} from '@prisma/client';
import { cleanIdentityAccessTestData } from '../../setup/test-db-cleaner';

const prisma = new PrismaClient();

jest.setTimeout(30000);

describe('Auth Integration (REAL DB)', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await cleanIdentityAccessTestData(prisma);
  });

  afterAll(async () => {
    await cleanIdentityAccessTestData(prisma);
    await prisma.$disconnect();
  });

  it('should create identity and session for user', async () => {
    const user = await prisma.user.create({
      data: {
        primaryEmail: `integration-test-auth-${Date.now()}@example.com`,
      },
    });

    const identity = await prisma.authIdentity.create({
      data: {
        userId: user.id,
        provider: AuthProvider.PASSWORD,
        providerSubject: `integration-test-subject-${Date.now()}`,
      },
    });

    const session = await prisma.authSession.create({
      data: {
        userId: user.id,
        authIdentityId: identity.id,
        provider: AuthProvider.PASSWORD,
        status: AuthSessionStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        deviceName: 'integration-test-device',
      },
    });

    expect(session.userId).toBe(user.id);
    expect(session.authIdentityId).toBe(identity.id);
    expect(session.provider).toBe(AuthProvider.PASSWORD);
    expect(session.status).toBe(AuthSessionStatus.ACTIVE);

    const foundIdentity = await prisma.authIdentity.findUnique({
      where: { id: identity.id },
    });

    expect(foundIdentity).not.toBeNull();
    expect(foundIdentity?.userId).toBe(user.id);

    const foundSession = await prisma.authSession.findUnique({
      where: { id: session.id },
    });

    expect(foundSession).not.toBeNull();
    expect(foundSession?.authIdentityId).toBe(identity.id);
  });
});