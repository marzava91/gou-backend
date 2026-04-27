// packages/api/src/modules/01-identity-and-access/07-access-resolution/__tests__/effective-permission.mapper.spec.ts

import {
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
} from '@prisma/client';

import { EffectivePermissionMapper } from '../mappers/effective-permission.mapper';

describe('EffectivePermissionMapper', () => {
  let mapper: EffectivePermissionMapper;

  beforeEach(() => {
    mapper = new EffectivePermissionMapper();
  });

  it('maps effective permissions to response dto', () => {
    const evaluatedAt = new Date('2026-04-18T12:00:00.000Z');

    const result = mapper.toResponse({
      surface: OperationalSurface.PARTNERS_WEB,
      membership: {
        membershipId: 'membership_1',
        userId: 'user_1',
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
      },
      capabilityKeys: ['catalog.publish', 'orders.read', 'users.manage'],
      evaluatedAt,
    });

    expect(result).toEqual({
      surface: OperationalSurface.PARTNERS_WEB,
      membership: {
        membershipId: 'membership_1',
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
      },
      capabilityKeys: ['catalog.publish', 'orders.read', 'users.manage'],
      evaluatedAt,
    });
  });

  it('passes through capability keys exactly as received from the service', () => {
    const result = mapper.toResponse({
      surface: OperationalSurface.PARTNERS_WEB,
      membership: {
        membershipId: 'membership_1',
        userId: 'user_1',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: MembershipStatus.ACTIVE,
      },
      capabilityKeys: ['catalog.publish', 'orders.read', 'users.manage'],
      evaluatedAt: new Date('2026-04-18T12:00:00.000Z'),
    });

    expect(result.capabilityKeys).toEqual([
      'catalog.publish',
      'orders.read',
      'users.manage',
    ]);
  });

  it('includes evaluatedAt', () => {
    const evaluatedAt = new Date('2026-04-18T12:00:00.000Z');

    const result = mapper.toResponse({
      surface: OperationalSurface.PARTNERS_WEB,
      membership: {
        membershipId: 'membership_1',
        userId: 'user_1',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: MembershipStatus.ACTIVE,
      },
      capabilityKeys: [],
      evaluatedAt,
    });

    expect(result.evaluatedAt).toBe(evaluatedAt);
  });
});