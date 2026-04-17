// packages/api/src/modules/01-identity-and-access/03-memberships/domain/rules/membership-active-eligibility.rule.ts

import { MembershipStatus } from '@prisma/client';

/**
 * TODO(membership-temporal-validity):
 * In the current MVP, active-context eligibility is driven primarily by
 * membership status.
 *
 * Future phases may also require evaluating temporal validity such as:
 * - effectiveFrom <= now
 * - expiresAt > now
 *
 * before considering a membership eligible for active operational context.
 */

export function isMembershipUsableAsActiveContext(
  status: MembershipStatus,
): boolean {
  return status === MembershipStatus.ACTIVE;
}
