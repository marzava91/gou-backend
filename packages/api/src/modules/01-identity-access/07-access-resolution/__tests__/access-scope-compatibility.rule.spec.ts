// packages/api/src/modules/01-identity-and-access/07-access-resolution/__tests__/access-scope-compatibility.rule.spec.ts

import {
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
} from '@prisma/client';
import { isMembershipCompatibleWithSurface } from '../domain/rules/access-scope-compatibility.rule';

describe('isMembershipCompatibleWithSurface', () => {
  const baseMembership = {
    membershipId: 'membership_1',
    userId: 'user_1',
    tenantId: 'tenant_1',
    storeId: null,
    status: MembershipStatus.ACTIVE,
  };

  it('allows TENANT membership on PARTNERS_WEB', () => {
    expect(
      isMembershipCompatibleWithSurface({
        membership: {
          ...baseMembership,
          scopeType: MembershipScopeType.TENANT,
        },
        surface: OperationalSurface.PARTNERS_WEB,
      }),
    ).toBe(true);
  });

  it('allows STORE membership on PARTNERS_WEB', () => {
    expect(
      isMembershipCompatibleWithSurface({
        membership: {
          ...baseMembership,
          scopeType: MembershipScopeType.STORE,
          storeId: 'store_1',
        },
        surface: OperationalSurface.PARTNERS_WEB,
      }),
    ).toBe(true);
  });
});