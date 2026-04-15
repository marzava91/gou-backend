// packages/api/src/modules/01-identity-and-access/03-memberships/domain/constants/membership.constants.ts

import {
  MembershipStatus,
  MembershipScopeType,
  OperationalSurface,
} from '@prisma/client';

export const MEMBERSHIP_DEFAULT_PAGE_SIZE = 20;
export const MEMBERSHIP_MAX_PAGE_SIZE = 100;

export const MEMBERSHIP_REASON_MAX_LENGTH = 500;

export const MEMBERSHIP_OPEN_STATUSES: MembershipStatus[] = [
  MembershipStatus.PENDING,
  MembershipStatus.ACTIVE,
  MembershipStatus.SUSPENDED,
];

export const MEMBERSHIP_ACTIVE_ELIGIBLE_STATUSES: MembershipStatus[] = [
  MembershipStatus.ACTIVE,
];

export const MEMBERSHIP_SUPPORTED_SCOPE_TYPES: MembershipScopeType[] = [
  MembershipScopeType.TENANT,
  MembershipScopeType.STORE,
];

export const MEMBERSHIP_SUPPORTED_OPERATIONAL_SURFACES: OperationalSurface[] = [
  OperationalSurface.PARTNERS_WEB,
];

export const MEMBERSHIP_AUDIT_ACTIONS = {
  MEMBERSHIP_CREATED: 'membership.created',
  MEMBERSHIP_ACTIVATED: 'membership.activated',
  MEMBERSHIP_SUSPENDED: 'membership.suspended',
  MEMBERSHIP_REVOKED: 'membership.revoked',
  MEMBERSHIP_EXPIRED: 'membership.expired',
  ACTIVE_CONTEXT_SET: 'membership.active_context.set',
  ACTIVE_CONTEXT_CLEARED: 'membership.active_context.cleared',
} as const;

export type MembershipAuditAction =
  (typeof MEMBERSHIP_AUDIT_ACTIONS)[keyof typeof MEMBERSHIP_AUDIT_ACTIONS];

export const MEMBERSHIP_LIST_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'effectiveFrom',
  'expiresAt',
  'status',
] as const;

export type MembershipListSortField =
  (typeof MEMBERSHIP_LIST_SORT_FIELDS)[number];

export const MEMBERSHIP_LIST_SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type MembershipListSortDirection =
  (typeof MEMBERSHIP_LIST_SORT_DIRECTIONS)[number];