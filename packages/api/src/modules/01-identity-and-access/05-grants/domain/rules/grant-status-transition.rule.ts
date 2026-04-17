import { GrantStatus } from '@prisma/client';

const ALLOWED_TRANSITIONS: Readonly<
  Record<GrantStatus, readonly GrantStatus[]>
> = {
  [GrantStatus.PROPOSED]: [GrantStatus.ACTIVE, GrantStatus.REVOKED],
  [GrantStatus.ACTIVE]: [GrantStatus.EXPIRED, GrantStatus.REVOKED],
  [GrantStatus.EXPIRED]: [],
  [GrantStatus.REVOKED]: [],
};

export function canTransitionGrantStatus(
  from: GrantStatus,
  to: GrantStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
