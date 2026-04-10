// packages\api\src\modules\01-identity-and-access\02-auth\domain\rules\auth-user-authenticable.rule.ts

import { UserStatus } from '@prisma/client';

const AUTHENTICABLE_STATUSES = new Set<UserStatus>([
  UserStatus.ACTIVE,
]);

export function isUserAuthenticable(status: UserStatus): boolean {
  return AUTHENTICABLE_STATUSES.has(status);
}