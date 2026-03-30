// packages\api\src\modules\01-identity-and-access\01-users\domain\rules\user-status-transition.rule.ts

/**
 * User Status Transition Rule
 *
 * Defines the allowed lifecycle transitions for UserStatus.
 *
 * TODO(identity-access):
 * - Evaluate if additional lifecycle states are required (e.g., MERGED handled externally).
 * - Validate whether transition rules should support contextual constraints
 *   (e.g., actor permissions, compliance rules, tenant-level policies).
 * - Consider moving this rule to a shared domain policy layer if other modules
 *   (e.g., Memberships, Access Resolution) require user lifecycle awareness.
 *
 * NOTE:
 * Same-status transitions (e.g., ACTIVE -> ACTIVE) are intentionally rejected.
 * Idempotency and "no-op" validations must be handled at the service layer.
 */

import { UserStatus } from '@prisma/client';

const ALLOWED_TRANSITIONS: Readonly<Record<UserStatus, readonly UserStatus[]>> = {
  [UserStatus.ACTIVE]: [UserStatus.SUSPENDED, UserStatus.DEACTIVATED],
  [UserStatus.SUSPENDED]: [UserStatus.ACTIVE, UserStatus.DEACTIVATED],
  [UserStatus.DEACTIVATED]: [UserStatus.ANONYMIZED],
  [UserStatus.ANONYMIZED]: [],
};

export function canTransitionUserStatus(
  from: UserStatus,
  to: UserStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}