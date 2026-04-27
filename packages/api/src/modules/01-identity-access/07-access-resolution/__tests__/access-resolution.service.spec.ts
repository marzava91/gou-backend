// packages/api/src/modules/01-identity-and-access/07-access-resolution/__tests__/access-resolution.service.spec.ts

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
} from '@prisma/client';

import type { AuthenticatedAccessActor } from '../domain/types/access-resolution.types';

import { AccessResolutionService } from '../application/access-resolution.service';
import { AccessResolutionSupportService } from '../application/support/access-resolution-support.service';

import {
  AccessContextNotResolvedError,
  AuthorizationUnresolvableError,
  InvalidAccessSessionError,
  InvalidActiveMembershipError,
  MembershipScopeMismatchError,
  SurfaceScopeConflictError,
} from '../domain/errors/access-resolution.errors';

describe('AccessResolutionService', () => {
  let service: AccessResolutionService;

  const authReader = {
    findSessionByIdAndUserId: jest.fn(),
    getActiveContext: jest.fn(),
  };

  const membershipReader = {
    findAuthorizationAnchorByMembershipId: jest.fn(),
  };

  const roleReader = {
    listActiveMembershipCapabilities: jest.fn(),
  };

  const grantReader = {
    listMembershipGrants: jest.fn(),
  };

  const support = {
    now: jest.fn(),
    recordEvaluation: jest.fn(),
    recordContextResolved: jest.fn(),
    recordEffectivePermissionsComputed: jest.fn(),
  } as unknown as jest.Mocked<AccessResolutionSupportService>;

  const actor: AuthenticatedAccessActor = {
    userId: 'user_1',
    sessionId: 'session_1',
    authIdentityId: 'identity_1',
    provider: AuthProvider.PASSWORD,
    isPlatformAdmin: false,
  };

  const activeMembership = {
    membershipId: 'membership_1',
    userId: 'user_1',
    scopeType: MembershipScopeType.TENANT,
    tenantId: 'tenant_1',
    storeId: null,
    status: MembershipStatus.ACTIVE,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    support.now.mockReturnValue(new Date('2026-04-18T11:00:00.000Z'));
    support.recordEvaluation.mockResolvedValue(undefined);
    support.recordContextResolved.mockResolvedValue(undefined);
    support.recordEffectivePermissionsComputed.mockResolvedValue(undefined);

    service = new AccessResolutionService(
      authReader as any,
      membershipReader as any,
      roleReader as any,
      grantReader as any,
      support,
    );
  });

  describe('evaluateAccess', () => {
    describe('success cases', () => {
        it('allows when baseline capability is present and no deny grant exists', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
            );

            roleReader.listActiveMembershipCapabilities.mockResolvedValue([
            {
                roleAssignmentId: 'assignment_1',
                roleId: 'role_1',
                roleKey: 'tenant_admin',
                roleScopeType: RoleScopeType.TENANT,
                assignmentStatus: RoleAssignmentStatus.ACTIVE,
                capabilityKey: 'orders.read',
            },
            ]);

            grantReader.listMembershipGrants.mockResolvedValue([]);

            const result = await service.evaluateAccess(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
            capabilityKey: ' orders.read ',
            });

            expect(result.allowed).toBe(true);
            expect(result.reasonCode).toBe('access_allowed');
            expect(result.capabilityKey).toBe('orders.read');
            expect(result.explanation.baselineMatchedCapability).toBe(true);
            expect(result.explanation.matchedDenyGrantIds).toEqual([]);
            expect(support.recordEvaluation).toHaveBeenCalledWith(
            expect.objectContaining({
                actorId: 'user_1',
                membershipId: 'membership_1',
                allowed: true,
                reasonCode: 'access_allowed',
                capabilityKey: 'orders.read',
            }),
            );
        });

        it('denies when deny grant applies even if baseline capability exists', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
            );

            roleReader.listActiveMembershipCapabilities.mockResolvedValue([
            {
                roleAssignmentId: 'assignment_1',
                roleId: 'role_1',
                roleKey: 'tenant_admin',
                roleScopeType: RoleScopeType.TENANT,
                assignmentStatus: RoleAssignmentStatus.ACTIVE,
                capabilityKey: 'orders.read',
            },
            ]);

            grantReader.listMembershipGrants.mockResolvedValue([
            {
                id: 'grant_deny_1',
                membershipId: 'membership_1',
                effect: GrantEffect.DENY,
                targetType: GrantTargetType.CAPABILITY,
                capabilityKey: 'orders.read',
                resourceKey: null,
                actionKey: null,
                status: GrantStatus.ACTIVE,
                validFrom: null,
                validUntil: null,
            },
            ]);

            const result = await service.evaluateAccess(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
            capabilityKey: 'orders.read',
            });

            expect(result.allowed).toBe(false);
            expect(result.reasonCode).toBe('access_denied');
            expect(result.explanation.baselineMatchedCapability).toBe(true);
            expect(result.explanation.matchedDenyGrantIds).toEqual(['grant_deny_1']);
        });

        it('allows by explicit allow grant even without baseline capability', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
            );

            roleReader.listActiveMembershipCapabilities.mockResolvedValue([]);

            grantReader.listMembershipGrants.mockResolvedValue([
            {
                id: 'grant_allow_1',
                membershipId: 'membership_1',
                effect: GrantEffect.ALLOW,
                targetType: GrantTargetType.CAPABILITY,
                capabilityKey: 'catalog.publish',
                resourceKey: null,
                actionKey: null,
                status: GrantStatus.ACTIVE,
                validFrom: null,
                validUntil: null,
            },
            ]);

            const result = await service.evaluateAccess(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
            capabilityKey: 'catalog.publish',
            });

            expect(result.allowed).toBe(true);
            expect(result.reasonCode).toBe('access_allowed');
            expect(result.explanation.baselineMatchedCapability).toBe(false);
            expect(result.explanation.matchedAllowGrantIds).toEqual(['grant_allow_1']);
        });

        it('denies when allow and deny grants both apply and deny prevails', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
                sessionId: 'session_1',
                userId: 'user_1',
                status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
                userId: 'user_1',
                membershipId: 'membership_1',
                surface: OperationalSurface.PARTNERS_WEB,
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_1',
                storeId: null,
                status: MembershipStatus.ACTIVE,
                updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
                activeMembership,
            );

            roleReader.listActiveMembershipCapabilities.mockResolvedValue([]);

            grantReader.listMembershipGrants.mockResolvedValue([
                {
                id: 'grant_allow_1',
                membershipId: 'membership_1',
                effect: GrantEffect.ALLOW,
                targetType: GrantTargetType.CAPABILITY,
                capabilityKey: 'orders.read',
                resourceKey: null,
                actionKey: null,
                status: GrantStatus.ACTIVE,
                validFrom: null,
                validUntil: null,
                },
                {
                id: 'grant_deny_1',
                membershipId: 'membership_1',
                effect: GrantEffect.DENY,
                targetType: GrantTargetType.CAPABILITY,
                capabilityKey: 'orders.read',
                resourceKey: null,
                actionKey: null,
                status: GrantStatus.ACTIVE,
                validFrom: null,
                validUntil: null,
                },
            ]);

            const result = await service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: 'orders.read',
            });

            expect(result.allowed).toBe(false);
            expect(result.reasonCode).toBe('access_denied');
            expect(result.explanation.baselineMatchedCapability).toBe(false);
            expect(result.explanation.matchedAllowGrantIds).toEqual(['grant_allow_1']);
            expect(result.explanation.matchedDenyGrantIds).toEqual(['grant_deny_1']);
        });

        it('denies by default when no baseline capability and no applicable grants exist', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
                sessionId: 'session_1',
                userId: 'user_1',
                status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
                userId: 'user_1',
                membershipId: 'membership_1',
                surface: OperationalSurface.PARTNERS_WEB,
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_1',
                storeId: null,
                status: MembershipStatus.ACTIVE,
                updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
                activeMembership,
            );

            roleReader.listActiveMembershipCapabilities.mockResolvedValue([]);
            grantReader.listMembershipGrants.mockResolvedValue([]);

            const result = await service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: 'orders.read',
            });

            expect(result.allowed).toBe(false);
            expect(result.reasonCode).toBe('access_denied');
            expect(result.explanation.baselineMatchedCapability).toBe(false);
            expect(result.explanation.matchedAllowGrantIds).toEqual([]);
            expect(result.explanation.matchedDenyGrantIds).toEqual([]);
        });

        it('resolves the same access decision from capabilityKey or equivalent resourceKey + actionKey', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
                sessionId: 'session_1',
                userId: 'user_1',
                status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
                userId: 'user_1',
                membershipId: 'membership_1',
                surface: OperationalSurface.PARTNERS_WEB,
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_1',
                storeId: null,
                status: MembershipStatus.ACTIVE,
                updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
                activeMembership,
            );

            roleReader.listActiveMembershipCapabilities.mockResolvedValue([
                {
                roleAssignmentId: 'assignment_1',
                roleId: 'role_1',
                roleKey: 'tenant_admin',
                roleScopeType: RoleScopeType.TENANT,
                assignmentStatus: RoleAssignmentStatus.ACTIVE,
                capabilityKey: 'orders.write',
                },
            ]);

            grantReader.listMembershipGrants.mockResolvedValue([]);

            const byCapability = await service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: ' orders.write ',
            });

            const byResourceAction = await service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                resourceKey: ' Orders ',
                actionKey: ' Write ',
            });

            expect(byCapability.allowed).toBe(true);
            expect(byResourceAction.allowed).toBe(true);

            expect(byCapability.reasonCode).toBe(byResourceAction.reasonCode);
            expect(byCapability.capabilityKey).toBe('orders.write');
            expect(byResourceAction.capabilityKey).toBe('orders.write');
            expect(byCapability.resourceKey).toBeNull();
            expect(byResourceAction.resourceKey).toBe('orders');
            expect(byResourceAction.actionKey).toBe('write');
        });

        it('denies when an allow grant exists but is already expired', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
                sessionId: 'session_1',
                userId: 'user_1',
                status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
                userId: 'user_1',
                membershipId: 'membership_1',
                surface: OperationalSurface.PARTNERS_WEB,
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_1',
                storeId: null,
                status: MembershipStatus.ACTIVE,
                updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
                activeMembership,
            );

            roleReader.listActiveMembershipCapabilities.mockResolvedValue([]);

            grantReader.listMembershipGrants.mockResolvedValue([
                {
                id: 'grant_allow_expired_1',
                membershipId: 'membership_1',
                effect: GrantEffect.ALLOW,
                targetType: GrantTargetType.CAPABILITY,
                capabilityKey: 'orders.read',
                resourceKey: null,
                actionKey: null,
                status: GrantStatus.ACTIVE,
                validFrom: null,
                validUntil: new Date('2026-04-18T10:59:59.000Z'),
                },
            ]);

            const result = await service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: 'orders.read',
            });

            expect(result.allowed).toBe(false);
            expect(result.reasonCode).toBe('access_denied');
            expect(result.explanation.baselineMatchedCapability).toBe(false);
            expect(result.explanation.matchedAllowGrantIds).toEqual([]);
            expect(result.explanation.matchedDenyGrantIds).toEqual([]);
        });

        it('prefers explicit membershipId over active context when both are available', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
                sessionId: 'session_1',
                userId: 'user_1',
                status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
                userId: 'user_1',
                membershipId: 'membership_from_context',
                surface: OperationalSurface.PARTNERS_WEB,
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_context',
                storeId: null,
                status: MembershipStatus.ACTIVE,
                updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue({
                membershipId: 'membership_explicit',
                userId: 'user_1',
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_explicit',
                storeId: null,
                status: MembershipStatus.ACTIVE,
            });

            roleReader.listActiveMembershipCapabilities.mockResolvedValue([
                {
                roleAssignmentId: 'assignment_1',
                roleId: 'role_1',
                roleKey: 'tenant_admin',
                roleScopeType: RoleScopeType.TENANT,
                assignmentStatus: RoleAssignmentStatus.ACTIVE,
                capabilityKey: 'orders.read',
                },
            ]);

            grantReader.listMembershipGrants.mockResolvedValue([]);

            const result = await service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                membershipId: 'membership_explicit',
                capabilityKey: 'orders.read',
            });

            expect(membershipReader.findAuthorizationAnchorByMembershipId).toHaveBeenCalledWith(
                'membership_explicit',
            );
            expect(result.membership?.membershipId).toBe('membership_explicit');
            expect(result.membership?.tenantId).toBe('tenant_explicit');
        });
    });

    describe('failure cases', () => {
        it('throws InvalidAccessSessionError when session is missing', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue(null);

            await expect(
            service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: 'orders.read',
            }),
            ).rejects.toBeInstanceOf(InvalidAccessSessionError);
        });

        it('throws AuthorizationUnresolvableError when neither capability nor resource/action is provided', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
            });

            await expect(
            service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
            }),
            ).rejects.toBeInstanceOf(AuthorizationUnresolvableError);
        });

        it('throws AccessContextNotResolvedError when membership cannot be resolved', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue(null);

            await expect(
            service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: 'orders.read',
            }),
            ).rejects.toBeInstanceOf(AccessContextNotResolvedError);
        });

        it('throws InvalidActiveMembershipError when membership status is not ACTIVE', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.SUSPENDED,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue({
            ...activeMembership,
            status: MembershipStatus.SUSPENDED,
            });

            await expect(
            service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: 'orders.read',
            }),
            ).rejects.toBeInstanceOf(InvalidActiveMembershipError);
        });

        it('throws MembershipScopeMismatchError when explicit membership belongs to another user', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue({
            ...activeMembership,
            userId: 'other_user',
            });

            await expect(
            service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: 'orders.read',
                membershipId: 'membership_999',
            }),
            ).rejects.toBeInstanceOf(MembershipScopeMismatchError);
        });

        it('throws SurfaceScopeConflictError when surface is incompatible with membership', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: 'UNKNOWN_SURFACE' as any,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
            );

            await expect(
            service.evaluateAccess(actor, {
                surface: 'UNKNOWN_SURFACE' as any,
                capabilityKey: 'orders.read',
            }),
            ).rejects.toBeInstanceOf(SurfaceScopeConflictError);
        });   

        it('throws AccessContextNotResolvedError when active context points to a membership that cannot be resolved', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
                sessionId: 'session_1',
                userId: 'user_1',
                status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
                userId: 'user_1',
                membershipId: 'membership_missing',
                surface: OperationalSurface.PARTNERS_WEB,
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_1',
                storeId: null,
                status: MembershipStatus.ACTIVE,
                updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(null);

            await expect(
                service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: 'orders.read',
                }),
            ).rejects.toBeInstanceOf(AccessContextNotResolvedError);
        });
    });
  });

  describe('listEffectivePermissions', () => {
    it('listEffectivePermissions removes baseline capability when an active deny grant targets it', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([
            {
            roleAssignmentId: 'assignment_1',
            roleId: 'role_1',
            roleKey: 'tenant_admin',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'orders.read',
            },
        ]);

        grantReader.listMembershipGrants.mockResolvedValue([
            {
            id: 'grant_deny_1',
            membershipId: 'membership_1',
            effect: GrantEffect.DENY,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'orders.read',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
            },
        ]);

        const result = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.capabilityKeys).toEqual([]);
    });

    it('listEffectivePermissions adds capability granted by active allow grant even without baseline', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([]);

        grantReader.listMembershipGrants.mockResolvedValue([
            {
            id: 'grant_allow_1',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'catalog.publish',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
            },
        ]);

        const result = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.capabilityKeys).toEqual(['catalog.publish']);
    });

    it('listEffectivePermissions derives capability from resource_action grants', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([]);

        grantReader.listMembershipGrants.mockResolvedValue([
            {
            id: 'grant_allow_ra_1',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.RESOURCE_ACTION,
            capabilityKey: null,
            resourceKey: 'Orders',
            actionKey: 'Write',
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
            },
        ]);

        const result = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.capabilityKeys).toEqual(['orders.write']);
    });

    it('evaluateAccess is consistent with listEffectivePermissions for the same resolved capability', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([
            {
            roleAssignmentId: 'assignment_1',
            roleId: 'role_1',
            roleKey: 'tenant_admin',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'orders.read',
            },
        ]);

        grantReader.listMembershipGrants.mockResolvedValue([
            {
            id: 'grant_deny_1',
            membershipId: 'membership_1',
            effect: GrantEffect.DENY,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'orders.read',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
            },
        ]);

        const permissions = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        const decision = await service.evaluateAccess(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
            capabilityKey: 'orders.read',
        });

        expect(permissions.capabilityKeys.includes('orders.read')).toBe(false);
        expect(decision.allowed).toBe(false);
        expect(decision.reasonCode).toBe('access_denied');
    });

    it('listEffectivePermissions returns normalized, deduplicated and sorted capability keys', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([
            {
            roleAssignmentId: 'assignment_1',
            roleId: 'role_1',
            roleKey: 'tenant_admin',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: ' Orders.Read ',
            },
            {
            roleAssignmentId: 'assignment_2',
            roleId: 'role_2',
            roleKey: 'catalog_manager',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'catalog.publish',
            },
            {
            roleAssignmentId: 'assignment_3',
            roleId: 'role_3',
            roleKey: 'sales_admin',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'orders.read',
            },
        ]);

        grantReader.listMembershipGrants.mockResolvedValue([
            {
            id: 'grant_allow_1',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: ' users.manage ',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
            },
            {
            id: 'grant_allow_2',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'catalog.publish',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
            },
        ]);

        const result = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.capabilityKeys).toEqual([
            'catalog.publish',
            'orders.read',
            'users.manage',
        ]);
    });

    it('listEffectivePermissions removes capability when allow and deny grants conflict and deny prevails', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([]);

        grantReader.listMembershipGrants.mockResolvedValue([
            {
            id: 'grant_allow_1',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'orders.read',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
            },
            {
            id: 'grant_deny_1',
            membershipId: 'membership_1',
            effect: GrantEffect.DENY,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'orders.read',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
            },
        ]);

        const result = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.capabilityKeys).not.toContain('orders.read');
        expect(result.capabilityKeys).toEqual([]);
    });

    it('listEffectivePermissions returns baseline capabilities when there are no grants', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([
            {
            roleAssignmentId: 'assignment_1',
            roleId: 'role_1',
            roleKey: 'tenant_admin',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'orders.read',
            },
            {
            roleAssignmentId: 'assignment_2',
            roleId: 'role_2',
            roleKey: 'catalog_manager',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'catalog.publish',
            },
        ]);

        grantReader.listMembershipGrants.mockResolvedValue([]);

        const result = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.capabilityKeys).toEqual([
            'catalog.publish',
            'orders.read',
        ]);

        expect(support.recordEffectivePermissionsComputed).toHaveBeenCalledWith(
            expect.objectContaining({
            actorId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            capabilityCount: 2,
            }),
        );
    });

    it('listEffectivePermissions returns an empty list when there are no baseline capabilities and no applicable grants', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([]);
        grantReader.listMembershipGrants.mockResolvedValue([]);

        const result = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.capabilityKeys).toEqual([]);

        expect(support.recordEffectivePermissionsComputed).toHaveBeenCalledWith(
            expect.objectContaining({
            actorId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            capabilityCount: 0,
            }),
        );
    });

    it('listEffectivePermissions ignores grants outside their validity window', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([
            {
            roleAssignmentId: 'assignment_1',
            roleId: 'role_1',
            roleKey: 'tenant_admin',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'orders.read',
            },
        ]);

        grantReader.listMembershipGrants.mockResolvedValue([
            {
            id: 'grant_allow_future_1',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'users.manage',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: new Date('2026-04-18T11:00:01.000Z'),
            validUntil: null,
            },
            {
            id: 'grant_deny_expired_1',
            membershipId: 'membership_1',
            effect: GrantEffect.DENY,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'orders.read',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: new Date('2026-04-18T10:59:59.000Z'),
            },
        ]);

        const result = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.capabilityKeys).toEqual(['orders.read']);
    });
  });

  describe('resolveAccessContext', () => {
    it('returns session, active context, membership and effective capability keys for a valid active context', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
        userId: 'user_1',
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
        updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue({
        membershipId: 'membership_1',
        userId: 'user_1',
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
        });

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([
        {
            roleAssignmentId: 'assignment_1',
            roleId: 'role_1',
            roleKey: 'store_manager',
            roleScopeType: RoleScopeType.STORE,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'orders.read',
        },
        ]);

        grantReader.listMembershipGrants.mockResolvedValue([
        {
            id: 'grant_allow_1',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'catalog.publish',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
        },
        ]);

        const result = await service.resolveAccessContext(actor, {
        surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.session).toEqual({
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.ACTIVE,
        });

        expect(result.activeContext).toEqual({
        userId: 'user_1',
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
        updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        expect(result.membership).toEqual({
        membershipId: 'membership_1',
        userId: 'user_1',
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
        });

        expect(result.effectiveCapabilityKeys).toEqual([
        'catalog.publish',
        'orders.read',
        ]);

        expect(support.recordContextResolved).toHaveBeenCalledWith(
        expect.objectContaining({
            actorId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            effectiveCapabilityCount: 2,
        }),
        );
    });

    it('throws AccessContextNotResolvedError when there is no active context and no explicit membershipId', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue(null);

        await expect(
        service.resolveAccessContext(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        }),
        ).rejects.toBeInstanceOf(AccessContextNotResolvedError);
    });

    it('throws InvalidActiveMembershipError when active context resolves to a suspended membership', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
        userId: 'user_1',
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: MembershipStatus.SUSPENDED,
        updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue({
        ...activeMembership,
        status: MembershipStatus.SUSPENDED,
        });

        await expect(
        service.resolveAccessContext(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        }),
        ).rejects.toBeInstanceOf(InvalidActiveMembershipError);
    });

    it('throws SurfaceScopeConflictError when active context resolves to an incompatible surface', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
        userId: 'user_1',
        membershipId: 'membership_1',
        surface: 'UNKNOWN_SURFACE' as any,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: MembershipStatus.ACTIVE,
        updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
        activeMembership,
        );

        await expect(
        service.resolveAccessContext(actor, {
            surface: 'UNKNOWN_SURFACE' as any,
        }),
        ).rejects.toBeInstanceOf(SurfaceScopeConflictError);
    });

    it('returns effective capability keys computed from baseline and grants', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.REFRESHED,
        });

        authReader.getActiveContext.mockResolvedValue({
        userId: 'user_1',
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: MembershipStatus.ACTIVE,
        updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
        activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([
        {
            roleAssignmentId: 'assignment_1',
            roleId: 'role_1',
            roleKey: 'tenant_admin',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'orders.read',
        },
        {
            roleAssignmentId: 'assignment_2',
            roleId: 'role_2',
            roleKey: 'catalog_manager',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'catalog.publish',
        },
        ]);

        grantReader.listMembershipGrants.mockResolvedValue([
        {
            id: 'grant_deny_1',
            membershipId: 'membership_1',
            effect: GrantEffect.DENY,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'orders.read',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
        },
        {
            id: 'grant_allow_1',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'users.manage',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
        },
        ]);

        const result = await service.resolveAccessContext(actor, {
        surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.effectiveCapabilityKeys).toEqual([
        'catalog.publish',
        'users.manage',
        ]);
    });
  });

  
});
