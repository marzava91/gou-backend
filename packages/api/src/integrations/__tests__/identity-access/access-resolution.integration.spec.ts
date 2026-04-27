// packages/api/src/integrations/__tests__/identity-access/access-resolution.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import {
  AuthProvider,
  AuthSessionStatus,
  GrantEffect,
  GrantStatus,
  GrantTargetType,
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
  RoleAssignmentStatus,
  RoleScopeType,
  UserStatus,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { AccessResolutionModule } from '../../../modules/01-identity-access/07-access-resolution/access-resolution.module';
import { AccessResolutionFacadeService } from '../../../modules/01-identity-access/07-access-resolution/access-resolution.service';
import { InvalidAccessSessionError } from '../../../modules/01-identity-access/07-access-resolution/domain/errors/access-resolution.errors';
import { cleanIdentityAccessTestData } from '../../setup/test-db-cleaner';

jest.setTimeout(30000);

describe('AccessResolution Integration (REAL DB)', () => {
  let moduleRef: TestingModule;
  let accessResolution: AccessResolutionFacadeService;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AccessResolutionModule],
    }).compile();

    accessResolution = moduleRef.get(AccessResolutionFacadeService);
    prisma = moduleRef.get(PrismaService);

    await prisma.$connect();
    await cleanIdentityAccessTestData(prisma);
  });

  afterAll(async () => {
    await cleanIdentityAccessTestData(prisma);
    await prisma.$disconnect();
    await moduleRef.close();
  });

  async function seedBaseAccessGraph() {
    const user = await prisma.user.create({
      data: {
        primaryEmail: `integration-test-access-${Date.now()}-${Math.random()}@example.com`,
        emailVerified: true,
        status: UserStatus.ACTIVE,
      },
    });

    const identity = await prisma.authIdentity.create({
      data: {
        userId: user.id,
        provider: AuthProvider.PASSWORD,
        providerSubject: `integration-test-access-subject-${Date.now()}-${Math.random()}`,
        email: user.primaryEmail,
        emailVerified: true,
      },
    });

    const session = await prisma.authSession.create({
      data: {
        userId: user.id,
        authIdentityId: identity.id,
        provider: AuthProvider.PASSWORD,
        status: AuthSessionStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        refreshExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        deviceName: 'integration-test-access-device',
      },
    });

    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        scopeType: MembershipScopeType.TENANT,
        tenantId: `integration-test-access-tenant-${Date.now()}-${Math.random()}`,
        status: MembershipStatus.ACTIVE,
        activatedAt: new Date(),
      },
    });

    await prisma.activeMembershipContext.create({
      data: {
        userId: user.id,
        surface: OperationalSurface.PARTNERS_WEB,
        membershipId: membership.id,
      },
    });

    return {
      user,
      identity,
      session,
      membership,
      actor: {
        userId: user.id,
        sessionId: session.id,
        authIdentityId: identity.id,
        provider: AuthProvider.PASSWORD,
        isPlatformAdmin: false,
      },
    };
  }

  async function createRoleWithAssignment(input: {
    membershipId: string;
    capabilityKeys: string[];
  }) {
    const role = await prisma.role.create({
      data: {
        key: `integration-test-access-role-${Date.now()}-${Math.random()}`,
        name: 'Integration Test Access Role',
        scopeType: RoleScopeType.TENANT,
        isSystem: false,
        capabilities: {
          create: input.capabilityKeys.map((capabilityKey) => ({
            capabilityKey,
          })),
        },
      },
    });

    const assignment = await prisma.roleAssignment.create({
      data: {
        membershipId: input.membershipId,
        roleId: role.id,
        status: RoleAssignmentStatus.ACTIVE,
        assignedBy: 'integration-test-actor',
      },
    });

    return { role, assignment };
  }

  async function createGrant(input: {
    membershipId: string;
    effect: GrantEffect;
    capabilityKey?: string | null;
    resourceKey?: string | null;
    actionKey?: string | null;
  }) {
    return prisma.grant.create({
      data: {
        membershipId: input.membershipId,
        effect: input.effect,
        targetType: input.capabilityKey
          ? GrantTargetType.CAPABILITY
          : GrantTargetType.RESOURCE_ACTION,
        capabilityKey: input.capabilityKey ?? null,
        resourceKey: input.resourceKey ?? null,
        actionKey: input.actionKey ?? null,
        status: GrantStatus.ACTIVE,
        activatedAt: new Date(),
        createdBy: 'integration-test-actor',
        version: 1,
      },
    });
  }

  it('allows access from role baseline capability', async () => {
    const { actor, membership } = await seedBaseAccessGraph();

    await createRoleWithAssignment({
      membershipId: membership.id,
      capabilityKeys: ['orders.read'],
    });

    const decision = await accessResolution.evaluateAccess(actor, {
      surface: OperationalSurface.PARTNERS_WEB,
      capabilityKey: 'orders.read',
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reasonCode).toBe('access_allowed');
    expect(decision.capabilityKey).toBe('orders.read');
    expect(decision.membership?.membershipId).toBe(membership.id);
    expect(decision.explanation.baselineMatchedCapability).toBe(true);
    expect(decision.explanation.matchedDenyGrantIds).toEqual([]);
  });

  it('denies access when DENY grant overrides baseline', async () => {
    const { actor, membership } = await seedBaseAccessGraph();

    await createRoleWithAssignment({
      membershipId: membership.id,
      capabilityKeys: ['orders.read'],
    });

    const denyGrant = await createGrant({
      membershipId: membership.id,
      effect: GrantEffect.DENY,
      capabilityKey: 'orders.read',
    });

    const decision = await accessResolution.evaluateAccess(actor, {
      surface: OperationalSurface.PARTNERS_WEB,
      capabilityKey: 'orders.read',
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasonCode).toBe('access_denied');
    expect(decision.explanation.baselineMatchedCapability).toBe(true);
    expect(decision.explanation.matchedDenyGrantIds).toEqual([denyGrant.id]);
  });

  it('allows access from explicit ALLOW grant without role baseline', async () => {
    const { actor, membership } = await seedBaseAccessGraph();

    const allowGrant = await createGrant({
      membershipId: membership.id,
      effect: GrantEffect.ALLOW,
      capabilityKey: 'catalog.publish',
    });

    const decision = await accessResolution.evaluateAccess(actor, {
      surface: OperationalSurface.PARTNERS_WEB,
      capabilityKey: 'catalog.publish',
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reasonCode).toBe('access_allowed');
    expect(decision.explanation.baselineMatchedCapability).toBe(false);
    expect(decision.explanation.matchedAllowGrantIds).toEqual([allowGrant.id]);
  });

  it('lists effective permissions from role + grants', async () => {
    const { actor, membership } = await seedBaseAccessGraph();

    await createRoleWithAssignment({
      membershipId: membership.id,
      capabilityKeys: ['orders.read', 'catalog.read'],
    });

    await createGrant({
      membershipId: membership.id,
      effect: GrantEffect.ALLOW,
      resourceKey: 'products',
      actionKey: 'publish',
    });

    await createGrant({
      membershipId: membership.id,
      effect: GrantEffect.DENY,
      capabilityKey: 'catalog.read',
    });

    const result = await accessResolution.listEffectivePermissions(actor, {
      surface: OperationalSurface.PARTNERS_WEB,
    });

    expect(result.membership.membershipId).toBe(membership.id);
    expect(result.capabilityKeys).toEqual([
      'orders.read',
      'products.publish',
    ]);
  });

  it('throws when session is invalid or expired', async () => {
    const { actor, session } = await seedBaseAccessGraph();

    await prisma.authSession.update({
      where: { id: session.id },
      data: {
        status: AuthSessionStatus.EXPIRED,
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    await expect(
      accessResolution.evaluateAccess(actor, {
        surface: OperationalSurface.PARTNERS_WEB,
        capabilityKey: 'orders.read',
      }),
    ).rejects.toBeInstanceOf(InvalidAccessSessionError);
  });
});