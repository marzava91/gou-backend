// packages/api/src/integrations/__tests__/identity-access/memberships.service.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import {
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
  UserStatus,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { MembershipsModule } from '../../../modules/01-identity-access/03-memberships/memberships.module';
import { MembershipsService } from '../../../modules/01-identity-access/03-memberships/memberships.service';

import { MEMBERSHIP_SCOPE_DIRECTORY_PORT } from '../../../modules/01-identity-access/03-memberships/ports/membership-scope-directory.port';

import {
  DuplicateMembershipError,
  InvalidMembershipScopeError,
  InvalidMembershipTransitionError,
  MembershipNotActiveError,
} from '../../../modules/01-identity-access/03-memberships/domain/errors/membership.errors';

import { cleanIdentityAccessTestData } from '../../setup/test-db-cleaner';

jest.setTimeout(30000);

describe('MembershipsService Integration (REAL DB)', () => {
  let moduleRef: TestingModule;
  let membershipsService: MembershipsService;
  let prisma: PrismaService;

  const scopeDirectory = {
    tenantExists: jest.fn(),
    storeExists: jest.fn(),
    storeBelongsToTenant: jest.fn(),
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [MembershipsModule],
    })
      .overrideProvider(MEMBERSHIP_SCOPE_DIRECTORY_PORT)
      .useValue(scopeDirectory)
      .compile();

    membershipsService = moduleRef.get(MembershipsService);
    prisma = moduleRef.get(PrismaService);

    await prisma.$connect();
    await cleanIdentityAccessTestData(prisma);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    scopeDirectory.tenantExists.mockResolvedValue(true);
    scopeDirectory.storeExists.mockResolvedValue(true);
    scopeDirectory.storeBelongsToTenant.mockResolvedValue(true);
  });

  afterAll(async () => {
    await cleanIdentityAccessTestData(prisma);
    await prisma.$disconnect();
    await moduleRef.close();
  });

  async function createIntegrationUser() {
    return prisma.user.create({
      data: {
        primaryEmail: `integration-test-membership-${Date.now()}@example.com`,
        emailVerified: true,
        status: UserStatus.ACTIVE,
      },
    });
  }

  it('creates a pending tenant membership through MembershipsService and persists history', async () => {
    const user = await createIntegrationUser();

    const membership = await membershipsService.createMembership(
      'integration-test-actor',
      {
        userId: user.id,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'integration-test-tenant',
        reason: '  onboarding  ',
      } as any,
    );

    expect(membership.id).toBeDefined();
    expect(membership.userId).toBe(user.id);
    expect(membership.status).toBe(MembershipStatus.PENDING);
    expect(membership.scopeType).toBe(MembershipScopeType.TENANT);
    expect(membership.tenantId).toBe('integration-test-tenant');
    expect(membership.storeId).toBeNull();
    expect(membership.reason).toBe('onboarding');

    const persisted = await prisma.membership.findUnique({
      where: { id: membership.id },
    });

    expect(persisted).not.toBeNull();
    expect(persisted?.status).toBe(MembershipStatus.PENDING);

    const history = await prisma.membershipStatusHistory.findMany({
      where: { membershipId: membership.id },
    });

    expect(history).toHaveLength(1);
    expect(history[0].fromStatus).toBeNull();
    expect(history[0].toStatus).toBe(MembershipStatus.PENDING);
  });

  it('rejects duplicate open membership through MembershipsService', async () => {
    const user = await createIntegrationUser();

    await membershipsService.createMembership(
      'integration-test-actor',
      {
        userId: user.id,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'integration-test-tenant-duplicate',
      } as any,
    );

    await expect(
      membershipsService.createMembership(
        'integration-test-actor',
        {
          userId: user.id,
          scopeType: MembershipScopeType.TENANT,
          tenantId: 'integration-test-tenant-duplicate',
        } as any,
      ),
    ).rejects.toBeInstanceOf(DuplicateMembershipError);
  });

  it('activates a pending membership and persists lifecycle history', async () => {
    const user = await createIntegrationUser();

    const membership = await membershipsService.createMembership(
      'integration-test-actor',
      {
        userId: user.id,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'integration-test-tenant-activate',
      } as any,
    );

    const activated = await membershipsService.activateMembership(
      'integration-test-actor',
      membership.id,
      { reason: 'approved' } as any,
    );

    expect(activated.status).toBe(MembershipStatus.ACTIVE);
    expect(activated.activatedAt).toBeInstanceOf(Date);

    const history = await prisma.membershipStatusHistory.findMany({
      where: { membershipId: membership.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(history.map((item) => item.toStatus)).toEqual([
      MembershipStatus.PENDING,
      MembershipStatus.ACTIVE,
    ]);
  });

  it('sets active membership context only for ACTIVE membership', async () => {
    const user = await createIntegrationUser();

    const membership = await membershipsService.createMembership(
      'integration-test-actor',
      {
        userId: user.id,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'integration-test-tenant-context',
      } as any,
    );

    await expect(
      membershipsService.setActiveMembershipContext(user.id, {
        membershipId: membership.id,
        surface: OperationalSurface.PARTNERS_WEB,
      }),
    ).rejects.toBeInstanceOf(MembershipNotActiveError);

    await membershipsService.activateMembership(
      'integration-test-actor',
      membership.id,
      { reason: 'approved' } as any,
    );

    const context = await membershipsService.setActiveMembershipContext(
      user.id,
      {
        membershipId: membership.id,
        surface: OperationalSurface.PARTNERS_WEB,
      },
    );

    expect(context.membershipId).toBe(membership.id);
    expect(context.userId).toBe(user.id);
    expect(context.surface).toBe(OperationalSurface.PARTNERS_WEB);

    const persistedContext = await prisma.activeMembershipContext.findUnique({
      where: {
        userId_surface: {
          userId: user.id,
          surface: OperationalSurface.PARTNERS_WEB,
        },
      },
    });

    expect(persistedContext).not.toBeNull();
    expect(persistedContext?.membershipId).toBe(membership.id);
  });

  it('rejects invalid tenant scope when tenant does not exist', async () => {
    const user = await createIntegrationUser();

    scopeDirectory.tenantExists.mockResolvedValue(false);

    await expect(
      membershipsService.createMembership(
        'integration-test-actor',
        {
          userId: user.id,
          scopeType: MembershipScopeType.TENANT,
          tenantId: 'integration-test-missing-tenant',
        } as any,
      ),
    ).rejects.toBeInstanceOf(InvalidMembershipScopeError);
  });

  it('rejects invalid lifecycle transition from revoked to active', async () => {
    const user = await createIntegrationUser();

    const membership = await membershipsService.createMembership(
      'integration-test-actor',
      {
        userId: user.id,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'integration-test-tenant-transition',
      } as any,
    );

    await membershipsService.revokeMembership(
      'integration-test-actor',
      membership.id,
      { reason: 'cancelled' } as any,
    );

    await expect(
      membershipsService.activateMembership(
        'integration-test-actor',
        membership.id,
        { reason: 'should fail' } as any,
      ),
    ).rejects.toBeInstanceOf(InvalidMembershipTransitionError);
  });
});