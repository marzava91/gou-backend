// packages/api/src/modules/01-identity-and-access/03-memberships/domain/rules/membership-status-transition.rule.ts

import { MembershipStatus } from '@prisma/client';

const VALID_TRANSITIONS: Record<MembershipStatus, MembershipStatus[]> = {
  [MembershipStatus.PENDING]: [
    MembershipStatus.ACTIVE,
    MembershipStatus.REVOKED,
    MembershipStatus.EXPIRED,
  ],
  [MembershipStatus.ACTIVE]: [
    MembershipStatus.SUSPENDED,
    MembershipStatus.REVOKED,
    MembershipStatus.EXPIRED,
  ],
  [MembershipStatus.SUSPENDED]: [
    MembershipStatus.ACTIVE,
    MembershipStatus.REVOKED,
  ],
  [MembershipStatus.REVOKED]: [],
  [MembershipStatus.EXPIRED]: [],
};

export function canTransitionMembershipStatus(
  from: MembershipStatus,
  to: MembershipStatus,
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}