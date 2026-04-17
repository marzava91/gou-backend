import { InvitationRecipientType } from '@prisma/client';

export const INVITATION_FIELD_LIMITS = {
  RECIPIENT_MAX_LENGTH: 320,
  ROLE_KEY_MAX_LENGTH: 120,
  ACTION_REASON_MAX_LENGTH: 500,
  TOKEN_HASH_MAX_LENGTH: 255,
  CREATED_BY_MAX_LENGTH: 191,
} as const;

export const INVITATION_OPERATIONAL_LIMITS = {
  DEFAULT_TTL_HOURS: 72,
  MIN_TTL_MINUTES: 15,
  MAX_TTL_HOURS: 24 * 30,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const INVITATION_AUDIT_ACTIONS = {
  INVITATION_CREATED: 'invitation.created',
  INVITATION_SENT: 'invitation.sent',
  INVITATION_RESENT: 'invitation.resent',
  INVITATION_REVOKED: 'invitation.revoked',
  INVITATION_CANCELED: 'invitation.canceled',
  INVITATION_DECLINED: 'invitation.declined',
  INVITATION_ACCEPTED: 'invitation.accepted',
  INVITATION_EXPIRED: 'invitation.expired',
  INVITATION_MEMBERSHIP_CONVERTED: 'invitation.membership_converted',
} as const;

export const INVITATION_LIST_SORT_FIELDS = {
  CREATED_AT: 'createdAt',
  EXPIRES_AT: 'expiresAt',
  STATUS: 'status',
} as const;

export const INVITATION_SORT_DIRECTIONS = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export const INVITATION_RECIPIENT_TYPES = {
  EMAIL: InvitationRecipientType.EMAIL,
  PHONE: InvitationRecipientType.PHONE,
} as const;

export type InvitationListSortField =
  (typeof INVITATION_LIST_SORT_FIELDS)[keyof typeof INVITATION_LIST_SORT_FIELDS];

export type InvitationSortDirection =
  (typeof INVITATION_SORT_DIRECTIONS)[keyof typeof INVITATION_SORT_DIRECTIONS];
