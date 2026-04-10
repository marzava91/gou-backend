// packages\api\src\modules\01-identity-and-access\02-auth\domain\rules\auth-session-status-transition.rule.ts

import { AuthSessionStatus, UserStatus } from '@prisma/client';

const VALID_TRANSITIONS: Record<AuthSessionStatus, AuthSessionStatus[]> = {
  [AuthSessionStatus.ISSUED]: [
    AuthSessionStatus.ACTIVE,
    AuthSessionStatus.REVOKED,
    AuthSessionStatus.EXPIRED,
    AuthSessionStatus.LOGGED_OUT,
  ],
  [AuthSessionStatus.ACTIVE]: [
    AuthSessionStatus.REFRESHED,
    AuthSessionStatus.REVOKED,
    AuthSessionStatus.EXPIRED,
    AuthSessionStatus.LOGGED_OUT,
  ],
  [AuthSessionStatus.REFRESHED]: [
    AuthSessionStatus.REVOKED,
    AuthSessionStatus.EXPIRED,
    AuthSessionStatus.LOGGED_OUT,
  ],
  [AuthSessionStatus.REVOKED]: [],
  [AuthSessionStatus.EXPIRED]: [],
  [AuthSessionStatus.LOGGED_OUT]: [],
};

export function canTransitionAuthSessionStatus(
  from: AuthSessionStatus,
  to: AuthSessionStatus,
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function canRefreshSession(status: AuthSessionStatus): boolean {
  return canTransitionAuthSessionStatus(status, AuthSessionStatus.REFRESHED);
}

export function canLogoutSession(status: AuthSessionStatus): boolean {
  return canTransitionAuthSessionStatus(status, AuthSessionStatus.LOGGED_OUT);
}

export function canRevokeSession(status: AuthSessionStatus): boolean {
  return canTransitionAuthSessionStatus(status, AuthSessionStatus.REVOKED);
}

export function isTerminalSessionStatus(status: AuthSessionStatus): boolean {
  return (
    status === AuthSessionStatus.REVOKED ||
    status === AuthSessionStatus.EXPIRED ||
    status === AuthSessionStatus.LOGGED_OUT
  );
}

