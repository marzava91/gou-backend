import {
  GrantEffect,
  GrantStatus,
  GrantTargetType,
  MembershipScopeType,
  MembershipStatus,
} from '@prisma/client';

import { GrantCommandService } from '../application/grant-command.service';
import {
  DuplicateActiveGrantError,
  GrantMembershipInactiveError,
  GrantMembershipNotFoundError,
  GrantNotFoundError,
  GrantTargetAmbiguousError,
  InvalidGrantTransitionError,
  InvalidGrantValidityWindowError,
} from '../domain/errors/grant.errors';
import { GRANT_AUDIT_ACTIONS } from '../domain/constants/grant.constants';
import { GrantDomainEvents } from '../domain/events/grant.events';

describe('GrantCommandService', () => {
  let service: GrantCommandService;

  const grantsRepository = {
    findDuplicateActiveGrant: jest.fn(),
    createGrantWithHistory: jest.fn(),
    findById: jest.fn(),
    revokeGrantWithHistory: jest.fn(),
  };

  const grantSupportService = {
    now: jest.fn(() => new Date('2026-04-15T12:00:00.000Z')),
    normalizeReason: jest.fn((value?: string | null) => value?.trim() || null),
    recordAudit: jest.fn(),
    publishEvent: jest.fn(),
  };

  const grantMembershipReaderPort = {
    findMembershipById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GrantCommandService(
      grantsRepository as any,
      grantSupportService as any,
      grantMembershipReaderPort as any,
    );
  });

  it('creates ALLOW capability grant on active membership', async () => {
    grantMembershipReaderPort.findMembershipById.mockResolvedValue({
      membershipId: 'membership_1',
      userId: 'user_1',
      scopeType: MembershipScopeType.TENANT,
      tenantId: 'tenant_1',
      storeId: null,
      status: MembershipStatus.ACTIVE,
    });

    grantsRepository.findDuplicateActiveGrant.mockResolvedValue(null);
    grantsRepository.createGrantWithHistory.mockResolvedValue({
      id: 'grant_1',
      membershipId: 'membership_1',
      effect: GrantEffect.ALLOW,
      targetType: GrantTargetType.CAPABILITY,
      capabilityKey: 'orders.read',
      resourceKey: null,
      actionKey: null,
      status: GrantStatus.ACTIVE,
      version: 1,
      createdAt: new Date('2026-04-15T12:00:00.000Z'),
      updatedAt: new Date('2026-04-15T12:00:00.000Z'),
    });

    const result = await service.createGrant('admin_1', {
      membershipId: 'membership_1',
      effect: GrantEffect.ALLOW,
      targetType: GrantTargetType.CAPABILITY,
      capabilityKey: ' Orders.Read ',
    });

    expect(grantsRepository.createGrantWithHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        membershipId: 'membership_1',
        effect: GrantEffect.ALLOW,
        targetType: GrantTargetType.CAPABILITY,
        capabilityKey: 'orders.read',
        status: GrantStatus.ACTIVE,
        history: expect.objectContaining({
          fromStatus: null,
          toStatus: GrantStatus.ACTIVE,
          changedBy: 'admin_1',
          reason: null,
        }),
      }),
    );

    expect(grantSupportService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: GRANT_AUDIT_ACTIONS.GRANT_CREATED,
        actorId: 'admin_1',
        targetId: 'grant_1',
      }),
    );

    expect(grantSupportService.publishEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: GrantDomainEvents.GRANT_CREATED,
      }),
    );

    expect(result).toEqual(expect.objectContaining({ id: 'grant_1' }));
  });

  it('rejects create when membership does not exist', async () => {
    grantMembershipReaderPort.findMembershipById.mockResolvedValue(null);

    await expect(
      service.createGrant('admin_1', {
        membershipId: 'membership_missing',
        effect: GrantEffect.ALLOW,
        targetType: GrantTargetType.CAPABILITY,
        capabilityKey: 'orders.read',
      }),
    ).rejects.toBeInstanceOf(GrantMembershipNotFoundError);
  });

  it('rejects create when membership is not active', async () => {
    grantMembershipReaderPort.findMembershipById.mockResolvedValue({
      membershipId: 'membership_1',
      userId: 'user_1',
      scopeType: MembershipScopeType.TENANT,
      tenantId: 'tenant_1',
      storeId: null,
      status: MembershipStatus.SUSPENDED,
    });

    await expect(
      service.createGrant('admin_1', {
        membershipId: 'membership_1',
        effect: GrantEffect.ALLOW,
        targetType: GrantTargetType.CAPABILITY,
        capabilityKey: 'orders.read',
      }),
    ).rejects.toBeInstanceOf(GrantMembershipInactiveError);
  });

  it('rejects ambiguous target', async () => {
    grantMembershipReaderPort.findMembershipById.mockResolvedValue({
      membershipId: 'membership_1',
      userId: 'user_1',
      scopeType: MembershipScopeType.TENANT,
      tenantId: 'tenant_1',
      storeId: null,
      status: MembershipStatus.ACTIVE,
    });

    await expect(
      service.createGrant('admin_1', {
        membershipId: 'membership_1',
        effect: GrantEffect.ALLOW,
        targetType: GrantTargetType.CAPABILITY,
        capabilityKey: 'orders.read',
        resourceKey: 'orders',
      } as any),
    ).rejects.toBeInstanceOf(GrantTargetAmbiguousError);
  });

  it('rejects duplicate active grant', async () => {
    grantMembershipReaderPort.findMembershipById.mockResolvedValue({
      membershipId: 'membership_1',
      userId: 'user_1',
      scopeType: MembershipScopeType.TENANT,
      tenantId: 'tenant_1',
      storeId: null,
      status: MembershipStatus.ACTIVE,
    });

    grantsRepository.findDuplicateActiveGrant.mockResolvedValue({
      id: 'grant_existing',
    });

    await expect(
      service.createGrant('admin_1', {
        membershipId: 'membership_1',
        effect: GrantEffect.DENY,
        targetType: GrantTargetType.CAPABILITY,
        capabilityKey: 'orders.write',
      }),
    ).rejects.toBeInstanceOf(DuplicateActiveGrantError);
  });

  it('revokes active grant', async () => {
    grantsRepository.findById.mockResolvedValue({
      id: 'grant_1',
      membershipId: 'membership_1',
      effect: GrantEffect.ALLOW,
      targetType: GrantTargetType.CAPABILITY,
      status: GrantStatus.ACTIVE,
      version: 2,
    });

    grantsRepository.revokeGrantWithHistory.mockResolvedValue({ count: 1 });

    const result = await service.revokeGrant('admin_1', 'grant_1', {
      reason: ' manual revoke ',
    });

    expect(grantsRepository.revokeGrantWithHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'grant_1',
        expectedVersion: 2,
        currentStatus: GrantStatus.ACTIVE,
        revokedBy: 'admin_1',
        revocationReason: 'manual revoke',
      }),
    );

    expect(result).toEqual({
      id: 'grant_1',
      status: GrantStatus.REVOKED,
      revokedAt: new Date('2026-04-15T12:00:00.000Z'),
    });
  });

  it('rejects revoke when grant does not exist', async () => {
    grantsRepository.findById.mockResolvedValue(null);

    await expect(
      service.revokeGrant('admin_1', 'missing_grant', {}),
    ).rejects.toBeInstanceOf(GrantNotFoundError);
  });

  it('rejects revoke when transition is invalid', async () => {
    grantsRepository.findById.mockResolvedValue({
      id: 'grant_1',
      membershipId: 'membership_1',
      effect: GrantEffect.ALLOW,
      targetType: GrantTargetType.CAPABILITY,
      status: GrantStatus.REVOKED,
      version: 2,
    });

    await expect(
      service.revokeGrant('admin_1', 'grant_1', {}),
    ).rejects.toBeInstanceOf(InvalidGrantTransitionError);
  });

  it('rejects create when validity window is invalid', async () => {
    grantMembershipReaderPort.findMembershipById.mockResolvedValue({
        membershipId: 'membership_1',
        userId: 'user_1',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: MembershipStatus.ACTIVE,
    });

    await expect(
        service.createGrant('admin_1', {
        membershipId: 'membership_1',
        effect: GrantEffect.ALLOW,
        targetType: GrantTargetType.CAPABILITY,
        capabilityKey: 'orders.read',
        validFrom: '2026-04-20T00:00:00.000Z',
        validUntil: '2026-04-19T00:00:00.000Z',
        }),
    ).rejects.toBeInstanceOf(InvalidGrantValidityWindowError);
  });

  it('creates RESOURCE_ACTION grant on active membership', async () => {
    grantMembershipReaderPort.findMembershipById.mockResolvedValue({
      membershipId: 'membership_1',
      userId: 'user_1',
      scopeType: MembershipScopeType.TENANT,
      tenantId: 'tenant_1',
      storeId: null,
      status: MembershipStatus.ACTIVE,
    });

    grantsRepository.findDuplicateActiveGrant.mockResolvedValue(null);
    grantsRepository.createGrantWithHistory.mockResolvedValue({
      id: 'grant_ra_1',
      membershipId: 'membership_1',
      effect: GrantEffect.DENY,
      targetType: GrantTargetType.RESOURCE_ACTION,
      capabilityKey: null,
      resourceKey: 'orders',
      actionKey: 'write',
      status: GrantStatus.ACTIVE,
      version: 1,
      createdAt: new Date('2026-04-15T12:00:00.000Z'),
      updatedAt: new Date('2026-04-15T12:00:00.000Z'),
    });

    const result = await service.createGrant('admin_1', {
      membershipId: 'membership_1',
      effect: GrantEffect.DENY,
      targetType: GrantTargetType.RESOURCE_ACTION,
      resourceKey: ' Orders ',
      actionKey: ' Write ',
    });

    expect(grantsRepository.createGrantWithHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        membershipId: 'membership_1',
        effect: GrantEffect.DENY,
        targetType: GrantTargetType.RESOURCE_ACTION,
        capabilityKey: null,
        resourceKey: 'orders',
        actionKey: 'write',
        status: GrantStatus.ACTIVE,
      }),
    );

    expect(result).toEqual(expect.objectContaining({ id: 'grant_ra_1' }));
  });

  it('rejects RESOURCE_ACTION grant when resourceKey is missing', async () => {
    grantMembershipReaderPort.findMembershipById.mockResolvedValue({
      membershipId: 'membership_1',
      userId: 'user_1',
      scopeType: MembershipScopeType.TENANT,
      tenantId: 'tenant_1',
      storeId: null,
      status: MembershipStatus.ACTIVE,
    });

    await expect(
      service.createGrant('admin_1', {
        membershipId: 'membership_1',
        effect: GrantEffect.ALLOW,
        targetType: GrantTargetType.RESOURCE_ACTION,
        actionKey: 'write',
      } as any),
    ).rejects.toBeInstanceOf(GrantTargetAmbiguousError);
  });

  it('normalizes and truncates creation reason before persisting', async () => {
    const longReason = `   ${'x'.repeat(700)}   `;

    grantMembershipReaderPort.findMembershipById.mockResolvedValue({
      membershipId: 'membership_1',
      userId: 'user_1',
      scopeType: MembershipScopeType.TENANT,
      tenantId: 'tenant_1',
      storeId: null,
      status: MembershipStatus.ACTIVE,
    });

    grantsRepository.findDuplicateActiveGrant.mockResolvedValue(null);
    grantSupportService.normalizeReason.mockReturnValue('x'.repeat(500));
    grantsRepository.createGrantWithHistory.mockResolvedValue({
      id: 'grant_1',
      membershipId: 'membership_1',
      effect: GrantEffect.ALLOW,
      targetType: GrantTargetType.CAPABILITY,
      capabilityKey: 'orders.read',
      resourceKey: null,
      actionKey: null,
      status: GrantStatus.ACTIVE,
      version: 1,
      createdAt: new Date('2026-04-15T12:00:00.000Z'),
      updatedAt: new Date('2026-04-15T12:00:00.000Z'),
    });

    await service.createGrant('admin_1', {
      membershipId: 'membership_1',
      effect: GrantEffect.ALLOW,
      targetType: GrantTargetType.CAPABILITY,
      capabilityKey: 'orders.read',
      reason: longReason,
    });

    expect(grantSupportService.normalizeReason).toHaveBeenCalledWith(longReason);
    expect(grantsRepository.createGrantWithHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        creationReason: 'x'.repeat(500),
        history: expect.objectContaining({
          reason: 'x'.repeat(500),
        }),
      }),
    );
  });

  it('rejects revoke when optimistic version update affects zero rows', async () => {
    grantsRepository.findById.mockResolvedValue({
      id: 'grant_1',
      membershipId: 'membership_1',
      effect: GrantEffect.ALLOW,
      targetType: GrantTargetType.CAPABILITY,
      status: GrantStatus.ACTIVE,
      version: 2,
    });

    grantsRepository.revokeGrantWithHistory.mockResolvedValue({ count: 0 });

    await expect(
      service.revokeGrant('admin_1', 'grant_1', { reason: 'conflict test' }),
    ).rejects.toBeInstanceOf(InvalidGrantTransitionError);
  });
});