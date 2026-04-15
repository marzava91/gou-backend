import { MembershipScopeType, RoleScopeType } from '@prisma/client';
import { isRoleScopeCompatibleWithMembership } from '../domain/rules/role-scope-compatibility.rule';

describe('isRoleScopeCompatibleWithMembership', () => {
  it('returns true for TENANT/TENANT', () => {
    expect(
      isRoleScopeCompatibleWithMembership({
        roleScopeType: RoleScopeType.TENANT,
        membershipScopeType: MembershipScopeType.TENANT,
      }),
    ).toBe(true);
  });

  it('returns false for TENANT/STORE', () => {
    expect(
      isRoleScopeCompatibleWithMembership({
        roleScopeType: RoleScopeType.TENANT,
        membershipScopeType: MembershipScopeType.STORE,
      }),
    ).toBe(false);
  });
});