// packages/api/src/modules/01-identity-and-access/07-access-resolution/domain/constants/access-resolution.constants.ts

import { AuthSessionStatus, GrantStatus, MembershipStatus } from '@prisma/client';

export const ACCESS_CAPABILITY_KEY_MAX_LENGTH = 160;
export const ACCESS_RESOURCE_KEY_MAX_LENGTH = 191;
export const ACCESS_ACTION_KEY_MAX_LENGTH = 191;

export const ACCESS_RESOLUTION_AUDIT_ACTIONS = {
  ACCESS_EVALUATED: 'access_resolution.access_evaluated',
  ACCESS_CONTEXT_RESOLVED: 'access_resolution.context_resolved',
  EFFECTIVE_PERMISSIONS_COMPUTED:
    'access_resolution.effective_permissions_computed',
} as const;

export type AccessResolutionAuditAction =
  (typeof ACCESS_RESOLUTION_AUDIT_ACTIONS)[keyof typeof ACCESS_RESOLUTION_AUDIT_ACTIONS];

export const ACCESS_RESOLUTION_ACTIVE_SESSION_STATUSES = new Set<AuthSessionStatus>([
  AuthSessionStatus.ACTIVE,
  AuthSessionStatus.REFRESHED,
]);

export const ACCESS_RESOLUTION_VALID_MEMBERSHIP_STATUSES = new Set<MembershipStatus>([
  MembershipStatus.ACTIVE,
]);

export const ACCESS_RESOLUTION_ACTIVE_GRANT_STATUSES = new Set<GrantStatus>([
  GrantStatus.ACTIVE,
]);