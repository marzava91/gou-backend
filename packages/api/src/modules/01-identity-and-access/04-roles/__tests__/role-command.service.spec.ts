import {
  MembershipScopeType,
  MembershipStatus,
  RoleAssignmentStatus,
  RoleScopeType,
} from '@prisma/client';
import {
  DuplicateRoleAssignmentError,
  InvalidRoleAssignmentTransitionError,
  RoleAlreadyExistsError,
  RoleAssignmentMembershipInactiveError,
  RoleAssignmentMembershipNotFoundError,
  RoleAssignmentNotFoundError,
  RoleMembershipScopeMismatchError,
  RoleRetiredError,
} from '../domain/errors/role.errors';
import { RoleCommandService } from '../application/role-command.service';
import { RoleDomainEvents } from '../domain/events/role.events';
import { ROLE_AUDIT_ACTIONS } from '../domain/constants/role.constants';

describe('RoleCommandService', () => {
  let service: RoleCommandService;

  const rolesRepository = {
    findRoleByKey: jest.fn(),
    createRole: jest.fn(),
    findRoleById: jest.fn(),
    findActiveAssignment: jest.fn(),
    createAssignment: jest.fn(),
    findAssignmentById: jest.fn(),
    revokeAssignment: jest.fn(),
  };

  const roleSupportService = {
    now: jest.fn(() => new Date('2026-04-15T10:00:00.000Z')),
    normalizeReason: jest.fn((value?: string | null) => value?.trim() || null),
    recordAudit: jest.fn(),
    publishEvent: jest.fn(),
  };

  const roleMembershipReaderPort = {
    findMembershipById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RoleCommandService(
      rolesRepository as any,
      roleSupportService as any,
      roleMembershipReaderPort as any,
    );
  });

  it('creates role with normalized key, normalized capabilities, audit and event', async () => {
    rolesRepository.findRoleByKey.mockResolvedValue(null);

    rolesRepository.createRole.mockResolvedValue({
      id: 'role_1',
      key: 'tenant_admin',
      name: 'Tenant Admin',
      description: 'Main tenant administrator',
      scopeType: RoleScopeType.TENANT,
      isSystem: false,
      retiredAt: null,
      version: 1,
      createdAt: new Date('2026-04-15T10:00:00.000Z'),
      updatedAt: new Date('2026-04-15T10:00:00.000Z'),
      capabilities: [
        { capabilityKey: 'orders.read' },
        { capabilityKey: 'orders.write' },
      ],
    });

    const result = await service.createRole('actor_1', {
      key: ' Tenant_Admin ',
      name: ' Tenant Admin ',
      description: ' Main tenant administrator ',
      scopeType: 'TENANT',
      capabilityKeys: [' orders.write ', 'ORDERS.READ', 'orders.read'],
    });

    expect(rolesRepository.findRoleByKey).toHaveBeenCalledWith('tenant_admin');

    expect(rolesRepository.createRole).toHaveBeenCalledWith({
      key: 'tenant_admin',
      name: 'Tenant Admin',
      description: 'Main tenant administrator',
      scopeType: 'TENANT',
      capabilityKeys: ['orders.read', 'orders.write'],
      isSystem: false,
    });

    expect(roleSupportService.recordAudit).toHaveBeenCalledWith({
      action: ROLE_AUDIT_ACTIONS.ROLE_CREATED,
      actorId: 'actor_1',
      targetId: 'role_1',
      payload: {
        key: 'tenant_admin',
        scopeType: RoleScopeType.TENANT,
        capabilityKeys: ['orders.read', 'orders.write'],
      },
      at: new Date('2026-04-15T10:00:00.000Z'),
    });

    expect(roleSupportService.publishEvent).toHaveBeenCalledWith({
      eventName: RoleDomainEvents.ROLE_CREATED,
      payload: {
        roleId: 'role_1',
        key: 'tenant_admin',
        scopeType: RoleScopeType.TENANT,
        capabilityKeys: ['orders.read', 'orders.write'],
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'role_1',
        key: 'tenant_admin',
        isSystem: false,
      }),
    );
  });

  it('rejects duplicate role key after normalization', async () => {
    rolesRepository.findRoleByKey.mockResolvedValue({
      id: 'role_existing',
      key: 'tenant_admin',
    });

    await expect(
      service.createRole('actor_1', {
        key: ' Tenant_Admin ',
        name: 'Tenant Admin',
        scopeType: 'TENANT',
        capabilityKeys: ['orders.read'],
      }),
    ).rejects.toBeInstanceOf(RoleAlreadyExistsError);

    expect(rolesRepository.findRoleByKey).toHaveBeenCalledWith('tenant_admin');
    expect(rolesRepository.createRole).not.toHaveBeenCalled();
  });

  it('uses explicit isSystem when provided', async () => {
    rolesRepository.findRoleByKey.mockResolvedValue(null);

    rolesRepository.createRole.mockResolvedValue({
      id: 'role_2',
      key: 'store_admin',
      name: 'Store Admin',
      description: null,
      scopeType: RoleScopeType.STORE,
      isSystem: true,
      retiredAt: null,
      version: 1,
      createdAt: new Date('2026-04-15T10:00:00.000Z'),
      updatedAt: new Date('2026-04-15T10:00:00.000Z'),
      capabilities: [{ capabilityKey: 'orders.read' }],
    });

    await service.createRole('actor_1', {
      key: 'store_admin',
      name: 'Store Admin',
      scopeType: 'STORE',
      capabilityKeys: ['orders.read'],
      isSystem: true,
    });

    expect(rolesRepository.createRole).toHaveBeenCalledWith({
      key: 'store_admin',
      name: 'Store Admin',
      description: null,
      scopeType: 'STORE',
      capabilityKeys: ['orders.read'],
      isSystem: true,
    });
  });

  it('assigns a compatible active role to an active membership', async () => {
    roleMembershipReaderPort.findMembershipById.mockResolvedValue({
      membershipId: 'membership_1',
      userId: 'user_1',
      scopeType: MembershipScopeType.TENANT,
      tenantId: 'tenant_1',
      storeId: null,
      status: MembershipStatus.ACTIVE,
    });

    rolesRepository.findRoleById.mockResolvedValue({
      id: 'role_1',
      scopeType: RoleScopeType.TENANT,
      retiredAt: null,
      capabilities: [],
    });

    rolesRepository.findActiveAssignment.mockResolvedValue(null);
    rolesRepository.createAssignment.mockResolvedValue({
      id: 'assignment_1',
      membershipId: 'membership_1',
      roleId: 'role_1',
      status: RoleAssignmentStatus.ACTIVE,
      role: { capabilities: [] },
    });

    const result = await service.assignRole('actor_1', {
      membershipId: 'membership_1',
      roleId: 'role_1',
      reason: ' initial setup ',
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'assignment_1',
        status: RoleAssignmentStatus.ACTIVE,
      }),
    );
  });

  it('rejects assignment when membership does not exist', async () => {
    roleMembershipReaderPort.findMembershipById.mockResolvedValue(null);

    await expect(
      service.assignRole('actor_1', {
        membershipId: 'missing',
        roleId: 'role_1',
      }),
    ).rejects.toBeInstanceOf(RoleAssignmentMembershipNotFoundError);
  });

  it('rejects assignment when membership is not active', async () => {
    roleMembershipReaderPort.findMembershipById.mockResolvedValue({
      membershipId: 'membership_1',
      userId: 'user_1',
      scopeType: MembershipScopeType.TENANT,
      tenantId: 'tenant_1',
      storeId: null,
      status: MembershipStatus.SUSPENDED,
    });

    await expect(
      service.assignRole('actor_1', {
        membershipId: 'membership_1',
        roleId: 'role_1',
      }),
    ).rejects.toBeInstanceOf(RoleAssignmentMembershipInactiveError);
  });

  it('rejects assignment when role scope mismatches membership scope', async () => {
    roleMembershipReaderPort.findMembershipById.mockResolvedValue({
      membershipId: 'membership_1',
      userId: 'user_1',
      scopeType: MembershipScopeType.STORE,
      tenantId: 'tenant_1',
      storeId: 'store_1',
      status: MembershipStatus.ACTIVE,
    });

    rolesRepository.findRoleById.mockResolvedValue({
      id: 'role_1',
      scopeType: RoleScopeType.TENANT,
      retiredAt: null,
      capabilities: [],
    });

    await expect(
      service.assignRole('actor_1', {
        membershipId: 'membership_1',
        roleId: 'role_1',
      }),
    ).rejects.toBeInstanceOf(RoleMembershipScopeMismatchError);
  });

  it('rejects assignment for retired role', async () => {
    roleMembershipReaderPort.findMembershipById.mockResolvedValue({
      membershipId: 'membership_1',
      userId: 'user_1',
      scopeType: MembershipScopeType.TENANT,
      tenantId: 'tenant_1',
      storeId: null,
      status: MembershipStatus.ACTIVE,
    });

    rolesRepository.findRoleById.mockResolvedValue({
      id: 'role_1',
      scopeType: RoleScopeType.TENANT,
      retiredAt: new Date('2026-04-01T00:00:00.000Z'),
      capabilities: [],
    });

    await expect(
      service.assignRole('actor_1', {
        membershipId: 'membership_1',
        roleId: 'role_1',
      }),
    ).rejects.toBeInstanceOf(RoleRetiredError);
  });

  it('rejects duplicate active assignment', async () => {
    roleMembershipReaderPort.findMembershipById.mockResolvedValue({
      membershipId: 'membership_1',
      userId: 'user_1',
      scopeType: MembershipScopeType.TENANT,
      tenantId: 'tenant_1',
      storeId: null,
      status: MembershipStatus.ACTIVE,
    });

    rolesRepository.findRoleById.mockResolvedValue({
      id: 'role_1',
      scopeType: RoleScopeType.TENANT,
      retiredAt: null,
      capabilities: [],
    });

    rolesRepository.findActiveAssignment.mockResolvedValue({
      id: 'assignment_existing',
    });

    await expect(
      service.assignRole('actor_1', {
        membershipId: 'membership_1',
        roleId: 'role_1',
      }),
    ).rejects.toBeInstanceOf(DuplicateRoleAssignmentError);
  });

  it('revokes an ACTIVE role assignment and records audit/event', async () => {
    rolesRepository.findAssignmentById.mockResolvedValue({
      id: 'assignment_1',
      membershipId: 'membership_1',
      roleId: 'role_1',
      status: RoleAssignmentStatus.ACTIVE,
      version: 3,
    });

    rolesRepository.revokeAssignment.mockResolvedValue(1);

    const result = await service.revokeRoleAssignment(
      'actor_1',
      'assignment_1',
      { reason: ' manual revoke ' },
    );

    expect(roleSupportService.normalizeReason).toHaveBeenCalledWith(
      ' manual revoke ',
    );

    expect(rolesRepository.revokeAssignment).toHaveBeenCalledWith({
      id: 'assignment_1',
      expectedVersion: 3,
      revokedBy: 'actor_1',
      reason: 'manual revoke',
      revokedAt: new Date('2026-04-15T10:00:00.000Z'),
    });

    expect(roleSupportService.recordAudit).toHaveBeenCalledWith({
      action: ROLE_AUDIT_ACTIONS.ROLE_ASSIGNMENT_REVOKED,
      actorId: 'actor_1',
      targetId: 'assignment_1',
      payload: {
        membershipId: 'membership_1',
        roleId: 'role_1',
      },
      at: new Date('2026-04-15T10:00:00.000Z'),
    });

    expect(roleSupportService.publishEvent).toHaveBeenCalledWith({
      eventName: RoleDomainEvents.ROLE_ASSIGNMENT_REVOKED,
      payload: {
        roleAssignmentId: 'assignment_1',
        membershipId: 'membership_1',
        roleId: 'role_1',
        revokedAt: new Date('2026-04-15T10:00:00.000Z'),
      },
    });

    expect(result).toEqual({
      id: 'assignment_1',
      status: RoleAssignmentStatus.REVOKED,
      revokedAt: new Date('2026-04-15T10:00:00.000Z'),
    });
  });

  it('fails when assignment does not exist', async () => {
    rolesRepository.findAssignmentById.mockResolvedValue(null);

    await expect(
      service.revokeRoleAssignment('actor_1', 'missing_assignment', {}),
    ).rejects.toBeInstanceOf(RoleAssignmentNotFoundError);

    expect(rolesRepository.revokeAssignment).not.toHaveBeenCalled();
  });

  it('fails when assignment is already revoked', async () => {
    rolesRepository.findAssignmentById.mockResolvedValue({
      id: 'assignment_1',
      membershipId: 'membership_1',
      roleId: 'role_1',
      status: RoleAssignmentStatus.REVOKED,
      version: 3,
    });

    await expect(
      service.revokeRoleAssignment('actor_1', 'assignment_1', {}),
    ).rejects.toBeInstanceOf(InvalidRoleAssignmentTransitionError);

    expect(rolesRepository.revokeAssignment).not.toHaveBeenCalled();
  });
});
