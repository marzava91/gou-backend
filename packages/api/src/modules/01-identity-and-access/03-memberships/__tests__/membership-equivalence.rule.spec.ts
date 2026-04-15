// packages/api/src/modules/01-identity-and-access/03-memberships/__tests__/membership-equivalence.rule.spec.ts

import {
  MembershipScopeType,
  MembershipStatus,
} from '@prisma/client';

import { buildEquivalentMembershipWhere } from '../domain/rules/membership-equivalence.rule';

describe('buildEquivalentMembershipWhere', () => {
  it('builds the expected filter for tenant-scoped membership', () => {
    expect(
      buildEquivalentMembershipWhere({
        userId: 'user_123',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_123',
        storeId: null,
      }),
    ).toEqual({
      userId: 'user_123',
      scopeType: MembershipScopeType.TENANT,
      tenantId: 'tenant_123',
      storeId: null,
      status: {
        in: [
          MembershipStatus.PENDING,
          MembershipStatus.ACTIVE,
          MembershipStatus.SUSPENDED,
        ],
      },
    });
  });

  it('builds the expected filter for store-scoped membership', () => {
    expect(
      buildEquivalentMembershipWhere({
        userId: 'user_123',
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_123',
        storeId: 'store_123',
      }),
    ).toEqual({
      userId: 'user_123',
      scopeType: MembershipScopeType.STORE,
      tenantId: 'tenant_123',
      storeId: 'store_123',
      status: {
        in: [
          MembershipStatus.PENDING,
          MembershipStatus.ACTIVE,
          MembershipStatus.SUSPENDED,
        ],
      },
    });
  });

  it('normalizes undefined storeId to null', () => {
    expect(
      buildEquivalentMembershipWhere({
        userId: 'user_123',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_123',
      }),
    ).toEqual({
      userId: 'user_123',
      scopeType: MembershipScopeType.TENANT,
      tenantId: 'tenant_123',
      storeId: null,
      status: {
        in: [
          MembershipStatus.PENDING,
          MembershipStatus.ACTIVE,
          MembershipStatus.SUSPENDED,
        ],
      },
    });
  });
});