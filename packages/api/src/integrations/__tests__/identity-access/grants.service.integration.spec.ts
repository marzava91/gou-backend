// packages/api/src/integrations/__tests__/identity-access/grants.service.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import {
  GrantEffect,
  GrantStatus,
  GrantTargetType,
  MembershipScopeType,
  MembershipStatus,
  UserStatus,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { GrantsModule } from '../../../modules/01-identity-access/05-grants/grants.module';
import { GrantsService } from '../../../modules/01-identity-access/05-grants/grants.service';

import { GRANT_MEMBERSHIP_READER_PORT } from '../../../modules/01-identity-access/05-grants/ports/grant-membership-reader.port';

import {
  DuplicateActiveGrantError,
  GrantMembershipInactiveError,
  GrantTargetAmbiguousError,
  InvalidGrantTransitionError,
  InvalidGrantValidityWindowError,
} from '../../../modules/01-identity-access/05-grants/domain/errors/grant.errors';

import { cleanIdentityAccessTestData } from '../../setup/test-db-cleaner';

jest.setTimeout(30000);

describe('GrantsService Integration (REAL DB)', () => {
  let moduleRef: TestingModule;
  let grantsService: GrantsService;
  let prisma: PrismaService;

  const grantMembershipReader = {
    findMembershipById: jest.fn(),
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [GrantsModule],
    })
      .overrideProvider(GRANT_MEMBERSHIP_READER_PORT)
      .useValue(grantMembershipReader)
      .compile();

    grantsService = moduleRef.get(GrantsService);
    prisma = moduleRef.get(PrismaService);

    await prisma.$connect();
    await cleanIdentityAccessTestData(prisma);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanIdentityAccessTestData(prisma);
    await prisma.$disconnect();
    await moduleRef.close();
  });

  async function createIntegrationUser() {
    return prisma.user.create({
      data: {
        primaryEmail: `integration-test-grants-${Date.now()}-${Math.random()}@example.com`,
        emailVerified: true,
        status: UserStatus.ACTIVE,
      },
    });
  }

  async function createMembership(status: MembershipStatus) {
    const user = await createIntegrationUser();

    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        scopeType: MembershipScopeType.TENANT,
        tenantId: `integration-test-tenant-grants-${Date.now()}-${Math.random()}`,
        status,
        activatedAt: status === MembershipStatus.ACTIVE ? new Date() : null,
        suspendedAt:
          status === MembershipStatus.SUSPENDED ? new Date() : null,
      },
    });

    return { user, membership };
  }

  function mockMembershipAnchor(input: {
    membership: {
      id: string;
      userId: string;
      scopeType: MembershipScopeType;
      tenantId: string;
      storeId: string | null;
      status: MembershipStatus;
    };
  }) {
    grantMembershipReader.findMembershipById.mockResolvedValue({
      membershipId: input.membership.id,
      userId: input.membership.userId,
      scopeType: input.membership.scopeType,
      tenantId: input.membership.tenantId,
      storeId: input.membership.storeId,
      status: input.membership.status,
    });
  }

  it('creates an ACTIVE capability grant and persists history', async () => {
    const { membership } = await createMembership(MembershipStatus.ACTIVE);
    mockMembershipAnchor({ membership });

    const grant = await grantsService.createGrant('integration-test-actor', {
      membershipId: membership.id,
      effect: GrantEffect.ALLOW,
      targetType: GrantTargetType.CAPABILITY,
      capabilityKey: ' Orders.Read ',
      reason: '  initial grant  ',
    } as any);

    expect(grant.id).toBeDefined();
    expect(grant.membershipId).toBe(membership.id);
    expect(grant.effect).toBe(GrantEffect.ALLOW);
    expect(grant.targetType).toBe(GrantTargetType.CAPABILITY);
    expect(grant.capabilityKey).toBe('orders.read');
    expect(grant.resourceKey).toBeNull();
    expect(grant.actionKey).toBeNull();
    expect(grant.status).toBe(GrantStatus.ACTIVE);
    expect(grant.creationReason).toBe('initial grant');

    const persisted = await prisma.grant.findUnique({
      where: { id: grant.id },
    });

    expect(persisted).not.toBeNull();
    expect(persisted?.status).toBe(GrantStatus.ACTIVE);

    const history = await prisma.grantHistory.findMany({
      where: { grantId: grant.id },
    });

    expect(history).toHaveLength(1);
    expect(history[0].fromStatus).toBeNull();
    expect(history[0].toStatus).toBe(GrantStatus.ACTIVE);
  });

  it('creates a RESOURCE_ACTION grant with normalized resource and action keys', async () => {
    const { membership } = await createMembership(MembershipStatus.ACTIVE);
    mockMembershipAnchor({ membership });

    const grant = await grantsService.createGrant('integration-test-actor', {
      membershipId: membership.id,
      effect: GrantEffect.DENY,
      targetType: GrantTargetType.RESOURCE_ACTION,
      resourceKey: ' Orders ',
      actionKey: ' Cancel ',
      reason: 'deny cancellation',
    } as any);

    expect(grant.effect).toBe(GrantEffect.DENY);
    expect(grant.targetType).toBe(GrantTargetType.RESOURCE_ACTION);
    expect(grant.capabilityKey).toBeNull();
    expect(grant.resourceKey).toBe('orders');
    expect(grant.actionKey).toBe('cancel');
  });

  it('rejects duplicate active grant', async () => {
    const { membership } = await createMembership(MembershipStatus.ACTIVE);
    mockMembershipAnchor({ membership });

    const dto = {
      membershipId: membership.id,
      effect: GrantEffect.ALLOW,
      targetType: GrantTargetType.CAPABILITY,
      capabilityKey: 'inventory.read',
    } as any;

    await grantsService.createGrant('integration-test-actor', dto);

    await expect(
      grantsService.createGrant('integration-test-actor', dto),
    ).rejects.toBeInstanceOf(DuplicateActiveGrantError);
  });

  it('rejects grant creation for inactive membership', async () => {
    const { membership } = await createMembership(MembershipStatus.SUSPENDED);
    mockMembershipAnchor({ membership });

    await expect(
      grantsService.createGrant('integration-test-actor', {
        membershipId: membership.id,
        effect: GrantEffect.ALLOW,
        targetType: GrantTargetType.CAPABILITY,
        capabilityKey: 'catalog.read',
      } as any),
    ).rejects.toBeInstanceOf(GrantMembershipInactiveError);
  });

  it('rejects ambiguous capability target', async () => {
    const { membership } = await createMembership(MembershipStatus.ACTIVE);
    mockMembershipAnchor({ membership });

    await expect(
      grantsService.createGrant('integration-test-actor', {
        membershipId: membership.id,
        effect: GrantEffect.ALLOW,
        targetType: GrantTargetType.CAPABILITY,
        capabilityKey: 'orders.read',
        resourceKey: 'orders',
      } as any),
    ).rejects.toBeInstanceOf(GrantTargetAmbiguousError);
  });

  it('rejects invalid validity window', async () => {
    const { membership } = await createMembership(MembershipStatus.ACTIVE);
    mockMembershipAnchor({ membership });

    await expect(
      grantsService.createGrant('integration-test-actor', {
        membershipId: membership.id,
        effect: GrantEffect.ALLOW,
        targetType: GrantTargetType.CAPABILITY,
        capabilityKey: 'orders.read',
        validFrom: '2026-05-10T00:00:00.000Z',
        validUntil: '2026-05-01T00:00:00.000Z',
      } as any),
    ).rejects.toBeInstanceOf(InvalidGrantValidityWindowError);
  });

  it('revokes an active grant and persists revocation history', async () => {
    const { membership } = await createMembership(MembershipStatus.ACTIVE);
    mockMembershipAnchor({ membership });

    const grant = await grantsService.createGrant('integration-test-actor', {
      membershipId: membership.id,
      effect: GrantEffect.ALLOW,
      targetType: GrantTargetType.CAPABILITY,
      capabilityKey: 'payments.refund',
      reason: 'temporary permission',
    } as any);

    const revoked = await grantsService.revokeGrant(
      'integration-test-actor',
      grant.id,
      { reason: '  no longer needed  ' } as any,
    );

    expect(revoked.id).toBe(grant.id);
    expect(revoked.status).toBe(GrantStatus.REVOKED);
    expect(revoked.revokedAt).toBeInstanceOf(Date);

    const persisted = await prisma.grant.findUnique({
      where: { id: grant.id },
    });

    expect(persisted?.status).toBe(GrantStatus.REVOKED);
    expect(persisted?.revokedBy).toBe('integration-test-actor');
    expect(persisted?.revocationReason).toBe('no longer needed');
    expect(persisted?.revokedAt).toBeInstanceOf(Date);
    expect(persisted?.version).toBe(2);

    const history = await prisma.grantHistory.findMany({
      where: { grantId: grant.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(history.map((item) => item.toStatus)).toEqual([
      GrantStatus.ACTIVE,
      GrantStatus.REVOKED,
    ]);
  });

  it('rejects revoking an already revoked grant', async () => {
    const { membership } = await createMembership(MembershipStatus.ACTIVE);
    mockMembershipAnchor({ membership });

    const grant = await grantsService.createGrant('integration-test-actor', {
      membershipId: membership.id,
      effect: GrantEffect.ALLOW,
      targetType: GrantTargetType.CAPABILITY,
      capabilityKey: `reports.view.${Date.now()}`,
    } as any);

    await grantsService.revokeGrant('integration-test-actor', grant.id, {
      reason: 'first revoke',
    } as any);

    await expect(
      grantsService.revokeGrant('integration-test-actor', grant.id, {
        reason: 'second revoke',
      } as any),
    ).rejects.toBeInstanceOf(InvalidGrantTransitionError);
  });
});