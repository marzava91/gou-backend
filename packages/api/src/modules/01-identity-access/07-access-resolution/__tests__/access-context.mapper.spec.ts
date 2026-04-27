// packages/api/src/modules/01-identity-and-access/07-access-resolution/__tests__/access-context.mapper.spec.ts

import {
  AuthSessionStatus,
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
} from '@prisma/client';

import { AccessContextMapper } from '../mappers/access-context.mapper';

describe('AccessContextMapper', () => {
  let mapper: AccessContextMapper;

  beforeEach(() => {
    mapper = new AccessContextMapper();
  });

  it('maps resolved access context to response dto', () => {
    const evaluatedAt = new Date('2026-04-18T12:00:00.000Z');
    const updatedAt = new Date('2026-04-18T11:30:00.000Z');

    const result = mapper.toResponse({
      session: {
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.ACTIVE,
      },
      activeContext: {
        userId: 'user_1',
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
        updatedAt,
      },
      membership: {
        membershipId: 'membership_1',
        userId: 'user_1',
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
      },
      effectiveCapabilityKeys: ['catalog.publish', 'orders.read'],
      evaluatedAt,
    });

    expect(result).toEqual({
      session: {
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.ACTIVE,
      },
      activeContext: {
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
        updatedAt,
      },
      membership: {
        membershipId: 'membership_1',
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
      },
      effectiveCapabilityKeys: ['catalog.publish', 'orders.read'],
      evaluatedAt,
    });
  });

  it('maps activeContext and membership as null when they are not resolved', () => {
    const result = mapper.toResponse({
      session: {
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.REFRESHED,
      },
      activeContext: null,
      membership: null,
      effectiveCapabilityKeys: [],
      evaluatedAt: new Date('2026-04-18T12:00:00.000Z'),
    });

    expect(result.activeContext).toBeNull();
    expect(result.membership).toBeNull();
    expect(result.effectiveCapabilityKeys).toEqual([]);
  });
});