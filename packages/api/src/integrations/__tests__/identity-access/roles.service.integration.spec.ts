// packages/api/src/integrations/__tests__/identity-access/roles.service.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import {
  MembershipScopeType,
  MembershipStatus,
  RoleAssignmentStatus,
  RoleScopeType,
  UserStatus,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { RolesModule } from '../../../modules/01-identity-access/04-roles/roles.module';
import { RolesService } from '../../../modules/01-identity-access/04-roles/roles.service';

import { ROLE_MEMBERSHIP_READER_PORT } from '../../../modules/01-identity-access/04-roles/ports/role-membership-reader.port';

import {
  DuplicateRoleAssignmentError,
  RoleAlreadyExistsError,
  RoleAssignmentMembershipInactiveError,
  InvalidRoleAssignmentTransitionError,
} from '../../../modules/01-identity-access/04-roles/domain/errors/role.errors';

import { cleanIdentityAccessTestData } from '../../setup/test-db-cleaner';

jest.setTimeout(30000);

describe('RolesService Integration (REAL DB)', () => {
  let moduleRef: TestingModule;
  let rolesService: RolesService;
  let prisma: PrismaService;

  const roleMembershipReader = {
    findMembershipById: jest.fn(),
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [RolesModule],
    })
      .overrideProvider(ROLE_MEMBERSHIP_READER_PORT)
      .useValue(roleMembershipReader)
      .compile();

    rolesService = moduleRef.get(RolesService);
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
        primaryEmail: `integration-test-roles-${Date.now()}-${Math.random()}@example.com`,
        emailVerified: true,
        status: UserStatus.ACTIVE,
      },
    });
  }

  async function createActiveTenantMembership() {
    const user = await createIntegrationUser();

    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        scopeType: MembershipScopeType.TENANT,
        tenantId: `integration-test-tenant-${Date.now()}-${Math.random()}`,
        status: MembershipStatus.ACTIVE,
        activatedAt: new Date(),
      },
    });

    return { user, membership };
  }

  async function createSuspendedTenantMembership() {
    const user = await createIntegrationUser();

    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        scopeType: MembershipScopeType.TENANT,
        tenantId: `integration-test-tenant-suspended-${Date.now()}-${Math.random()}`,
        status: MembershipStatus.SUSPENDED,
        suspendedAt: new Date(),
      },
    });

    return { user, membership };
  }

  it('creates a role through RolesService and persists capabilities', async () => {
    const role = await rolesService.createRole('integration-test-actor', {
      key: ` Integration-Test-Role-${Date.now()} `,
      name: ' Integration Test Role ',
      description: '  Test role  ',
      scopeType: RoleScopeType.TENANT,
      capabilityKeys: ['orders.read', ' Orders.Write ', 'orders.read'],
      isSystem: false,
    } as any);

    expect(role.id).toBeDefined();
    expect(role.key).toContain('integration-test-role-');
    expect(role.name).toBe('Integration Test Role');
    expect(role.scopeType).toBe(RoleScopeType.TENANT);

    const persisted = await prisma.role.findUnique({
      where: { id: role.id },
      include: {
        capabilities: {
          orderBy: { capabilityKey: 'asc' },
        },
      },
    });

    expect(persisted).not.toBeNull();
    expect(persisted?.capabilities.map((item) => item.capabilityKey)).toEqual([
      'orders.read',
      'orders.write',
    ]);
  });

  it('rejects duplicate role key through RolesService', async () => {
    const key = `integration-test-duplicate-role-${Date.now()}`;

    await rolesService.createRole('integration-test-actor', {
      key,
      name: 'Duplicate Role One',
      scopeType: RoleScopeType.TENANT,
      capabilityKeys: ['catalog.read'],
    } as any);

    await expect(
      rolesService.createRole('integration-test-actor', {
        key: ` ${key.toUpperCase()} `,
        name: 'Duplicate Role Two',
        scopeType: RoleScopeType.TENANT,
        capabilityKeys: ['catalog.write'],
      } as any),
    ).rejects.toBeInstanceOf(RoleAlreadyExistsError);
  });

  it('assigns a role to an active membership and persists assignment history', async () => {
    const { user, membership } = await createActiveTenantMembership();

    roleMembershipReader.findMembershipById.mockResolvedValue({
      membershipId: membership.id,
      userId: user.id,
      scopeType: membership.scopeType,
      tenantId: membership.tenantId,
      storeId: membership.storeId,
      status: membership.status,
    });

    const role = await rolesService.createRole('integration-test-actor', {
      key: `integration-test-assign-role-${Date.now()}`,
      name: 'Assignable Role',
      scopeType: RoleScopeType.TENANT,
      capabilityKeys: ['orders.read'],
    } as any);

    const assignment = await rolesService.assignRole('integration-test-actor', {
      membershipId: membership.id,
      roleId: role.id,
      reason: '  initial assignment  ',
    } as any);

    expect(assignment.id).toBeDefined();
    expect(assignment.membershipId).toBe(membership.id);
    expect(assignment.roleId).toBe(role.id);
    expect(assignment.status).toBe(RoleAssignmentStatus.ACTIVE);
    expect(assignment.reason).toBe('initial assignment');

    const persisted = await prisma.roleAssignment.findUnique({
      where: { id: assignment.id },
    });

    expect(persisted).not.toBeNull();
    expect(persisted?.status).toBe(RoleAssignmentStatus.ACTIVE);

    const history = await prisma.roleAssignmentHistory.findMany({
      where: { roleAssignmentId: assignment.id },
    });

    expect(history).toHaveLength(1);
    expect(history[0].fromStatus).toBeNull();
    expect(history[0].toStatus).toBe(RoleAssignmentStatus.ACTIVE);
  });

  it('rejects duplicate active role assignment', async () => {
    const { user, membership } = await createActiveTenantMembership();

    roleMembershipReader.findMembershipById.mockResolvedValue({
      membershipId: membership.id,
      userId: user.id,
      scopeType: membership.scopeType,
      tenantId: membership.tenantId,
      storeId: membership.storeId,
      status: membership.status,
    });

    const role = await rolesService.createRole('integration-test-actor', {
      key: `integration-test-duplicate-assignment-${Date.now()}`,
      name: 'Duplicate Assignment Role',
      scopeType: RoleScopeType.TENANT,
      capabilityKeys: ['inventory.read'],
    } as any);

    await rolesService.assignRole('integration-test-actor', {
      membershipId: membership.id,
      roleId: role.id,
    } as any);

    await expect(
      rolesService.assignRole('integration-test-actor', {
        membershipId: membership.id,
        roleId: role.id,
      } as any),
    ).rejects.toBeInstanceOf(DuplicateRoleAssignmentError);
  });

  it('rejects role assignment for inactive membership', async () => {
    const { user, membership } = await createSuspendedTenantMembership();

    roleMembershipReader.findMembershipById.mockResolvedValue({
      membershipId: membership.id,
      userId: user.id,
      scopeType: membership.scopeType,
      tenantId: membership.tenantId,
      storeId: membership.storeId,
      status: membership.status,
    });

    const role = await rolesService.createRole('integration-test-actor', {
      key: `integration-test-inactive-membership-role-${Date.now()}`,
      name: 'Inactive Membership Role',
      scopeType: RoleScopeType.TENANT,
      capabilityKeys: ['catalog.read'],
    } as any);

    await expect(
      rolesService.assignRole('integration-test-actor', {
        membershipId: membership.id,
        roleId: role.id,
      } as any),
    ).rejects.toBeInstanceOf(RoleAssignmentMembershipInactiveError);
  });

  it('revokes an active role assignment and persists revocation history', async () => {
    const { user, membership } = await createActiveTenantMembership();

    roleMembershipReader.findMembershipById.mockResolvedValue({
      membershipId: membership.id,
      userId: user.id,
      scopeType: membership.scopeType,
      tenantId: membership.tenantId,
      storeId: membership.storeId,
      status: membership.status,
    });

    const role = await rolesService.createRole('integration-test-actor', {
      key: `integration-test-revoke-role-${Date.now()}`,
      name: 'Revokable Role',
      scopeType: RoleScopeType.TENANT,
      capabilityKeys: ['payments.read'],
    } as any);

    const assignment = await rolesService.assignRole('integration-test-actor', {
      membershipId: membership.id,
      roleId: role.id,
      reason: 'initial',
    } as any);

    const revoked = await rolesService.revokeRoleAssignment(
      'integration-test-actor',
      assignment.id,
      { reason: 'no longer needed' } as any,
    );

    expect(revoked.id).toBe(assignment.id);
    expect(revoked.status).toBe(RoleAssignmentStatus.REVOKED);
    expect(revoked.revokedAt).toBeInstanceOf(Date);

    const persisted = await prisma.roleAssignment.findUnique({
      where: { id: assignment.id },
    });

    expect(persisted?.status).toBe(RoleAssignmentStatus.REVOKED);
    expect(persisted?.revokedBy).toBe('integration-test-actor');
    expect(persisted?.revokedAt).toBeInstanceOf(Date);

    const history = await prisma.roleAssignmentHistory.findMany({
      where: { roleAssignmentId: assignment.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(history.map((item) => item.toStatus)).toEqual([
      RoleAssignmentStatus.ACTIVE,
      RoleAssignmentStatus.REVOKED,
    ]);
  });

  it('rejects revoking an already revoked role assignment', async () => {
    const { user, membership } = await createActiveTenantMembership();

    roleMembershipReader.findMembershipById.mockResolvedValue({
      membershipId: membership.id,
      userId: user.id,
      scopeType: membership.scopeType,
      tenantId: membership.tenantId,
      storeId: membership.storeId,
      status: membership.status,
    });

    const role = await rolesService.createRole('integration-test-actor', {
      key: `integration-test-double-revoke-role-${Date.now()}`,
      name: 'Double Revoke Role',
      scopeType: RoleScopeType.TENANT,
      capabilityKeys: ['reports.read'],
    } as any);

    const assignment = await rolesService.assignRole('integration-test-actor', {
      membershipId: membership.id,
      roleId: role.id,
    } as any);

    await rolesService.revokeRoleAssignment(
      'integration-test-actor',
      assignment.id,
      { reason: 'first revoke' } as any,
    );

    await expect(
      rolesService.revokeRoleAssignment(
        'integration-test-actor',
        assignment.id,
        { reason: 'second revoke' } as any,
      ),
    ).rejects.toBeInstanceOf(InvalidRoleAssignmentTransitionError);
  });
});