import { GrantEffect, GrantStatus, GrantTargetType } from '@prisma/client';

export const GRANT_REASON_MAX_LENGTH = 500;
export const GRANT_CAPABILITY_KEY_MAX_LENGTH = 191;
export const GRANT_RESOURCE_KEY_MAX_LENGTH = 191;
export const GRANT_ACTION_KEY_MAX_LENGTH = 191;

export const DEFAULT_GRANT_STATUS_ON_CREATE = GrantStatus.ACTIVE;

export const GRANT_AUDIT_ACTIONS = {
  GRANT_CREATED: 'grant_created',
  GRANT_REVOKED: 'grant_revoked',
  GRANT_EXPIRED: 'grant_expired',
} as const;

export type GrantAuditAction =
  (typeof GRANT_AUDIT_ACTIONS)[keyof typeof GRANT_AUDIT_ACTIONS];

export const SUPPORTED_GRANT_EFFECTS = [
  GrantEffect.ALLOW,
  GrantEffect.DENY,
] as const;
export const SUPPORTED_GRANT_TARGET_TYPES = [
  GrantTargetType.CAPABILITY,
  GrantTargetType.RESOURCE_ACTION,
] as const;
