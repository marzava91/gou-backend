// packages/api/src/modules/01-identity-and-access/07-access-resolution/__tests__/access-reader-ports.contract.spec.ts

import {
  AuthSessionStatus,
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
  RoleAssignmentStatus,
  RoleScopeType,
  GrantEffect,
  GrantStatus,
  GrantTargetType,
} from '@prisma/client';

import type { AccessAuthReaderPort } from '../ports/access-auth-reader.port';
import type { AccessMembershipReaderPort } from '../ports/access-membership-reader.port';
import type { AccessRoleReaderPort } from '../ports/access-role-reader.port';
import type { AccessGrantReaderPort } from '../ports/access-grant-reader.port';

describe('Access Reader Ports Contracts', () => {

  describe('AccessAuthReaderPort', () => {
    const port: AccessAuthReaderPort = {
      async findSessionByIdAndUserId() {
        return {
          sessionId: 'session_1',
          userId: 'user_1',
          status: AuthSessionStatus.ACTIVE,
        };
      },
      async getActiveContext() {
        return {
          userId: 'user_1',
          membershipId: 'membership_1',
          surface: OperationalSurface.PARTNERS_WEB,
          scopeType: MembershipScopeType.TENANT,
          tenantId: 'tenant_1',
          storeId: null,
          status: MembershipStatus.ACTIVE,
          updatedAt: new Date(),
        };
      },
    };

    it('should return session with minimum required shape', async () => {
      const result = await port.findSessionByIdAndUserId({
        sessionId: 'session_1',
        userId: 'user_1',
      });

      expect(result).toEqual(
        expect.objectContaining({
          sessionId: expect.any(String),
          userId: expect.any(String),
          status: AuthSessionStatus.ACTIVE,
        }),
      );
    });

    it('should return active context with minimum required shape', async () => {
      const result = await port.getActiveContext({
        userId: 'user_1',
        surface: OperationalSurface.PARTNERS_WEB,
      });

      expect(result).toEqual(
        expect.objectContaining({
          userId: expect.any(String),
          membershipId: expect.any(String),
          surface: OperationalSurface.PARTNERS_WEB,
          scopeType: expect.any(String),
          tenantId: expect.any(String),
          status: MembershipStatus.ACTIVE,
          updatedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('AccessMembershipReaderPort', () => {
    const port: AccessMembershipReaderPort = {
      async findAuthorizationAnchorByMembershipId() {
        return {
          membershipId: 'membership_1',
          userId: 'user_1',
          scopeType: MembershipScopeType.TENANT,
          tenantId: 'tenant_1',
          storeId: null,
          status: MembershipStatus.ACTIVE,
        };
      },
    };

    it('should return membership anchor with minimum required shape', async () => {
      const result = await port.findAuthorizationAnchorByMembershipId('membership_1');

      expect(result).toEqual(
        expect.objectContaining({
          membershipId: expect.any(String),
          userId: expect.any(String),
          scopeType: MembershipScopeType.TENANT,
          tenantId: expect.any(String),
          status: MembershipStatus.ACTIVE,
        }),
      );
    });
  });

  describe('AccessRoleReaderPort', () => {
    const port: AccessRoleReaderPort = {
      async listActiveMembershipCapabilities() {
        return [
          {
            roleAssignmentId: 'assignment_1',
            roleId: 'role_1',
            roleKey: 'tenant_admin',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'orders.read',
          },
        ];
      },
    };

    it('should return baseline capabilities with minimum required shape', async () => {
      const result = await port.listActiveMembershipCapabilities('membership_1');

      expect(result[0]).toEqual(
        expect.objectContaining({
          roleAssignmentId: expect.any(String),
          roleId: expect.any(String),
          roleKey: expect.any(String),
          roleScopeType: expect.any(String),
          assignmentStatus: RoleAssignmentStatus.ACTIVE,
          capabilityKey: expect.any(String),
        }),
      );
    });
  });

  describe('AccessGrantReaderPort', () => {
    const port: AccessGrantReaderPort = {
      async listMembershipGrants() {
        return [
          {
            id: 'grant_1',
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
        ];
      },
    };

    it('should return grants with minimum required shape', async () => {
      const result = await port.listMembershipGrants('membership_1');

      expect(result[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          membershipId: expect.any(String),
          effect: expect.any(String),
          targetType: expect.any(String),
          status: expect.any(String),
          validFrom: null,
          validUntil: null,
        }),
      );
    });
  });

});