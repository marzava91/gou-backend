// packages/api/src/modules/01-identity-and-access/03-memberships/__tests__/membership-active-eligibility.rule.spec.ts

import { MembershipStatus } from '@prisma/client';

import { isMembershipUsableAsActiveContext } from '../domain/rules/membership-active-eligibility.rule';

describe('isMembershipUsableAsActiveContext', () => {
  it('returns true when status is ACTIVE', () => {
    expect(isMembershipUsableAsActiveContext(MembershipStatus.ACTIVE)).toBe(
      true,
    );
  });

  it.each([
    MembershipStatus.PENDING,
    MembershipStatus.SUSPENDED,
    MembershipStatus.REVOKED,
    MembershipStatus.EXPIRED,
  ])('returns false when status is %s', (status) => {
    expect(isMembershipUsableAsActiveContext(status)).toBe(false);
  });
});
