// packages\api\src\modules\01-identity-and-access\02-auth\domain\constants\auth.constants.ts

import {
  AuthProvider,
  AuthSessionStatus,
  AuthVerificationChallengeStatus,
} from '@prisma/client';

/**
 * Auth Security Policy
 *
 * Defines runtime behavior (TTL, attempts, lifecycle rules).
 */
export const AUTH_SECURITY_POLICY = {
  SESSION: {
    ACCESS_TOKEN_TTL_MINUTES: 60,
    REFRESH_TOKEN_TTL_DAYS: 30,
  },

  VERIFICATION: {
    CODE_TTL_MINUTES: 10,
    MAX_ATTEMPTS: 5,
  },

  PASSWORD_RESET: {
    CODE_TTL_MINUTES: 10,
    MAX_ATTEMPTS: 5,
  },

  SESSION_HARDENING: {
    ROTATE_REFRESH_TOKEN: true,
    REVOKE_ON_PASSWORD_RESET: true,
  },
} as const;

export const AUTH_IDENTIFIER_LIMITS = {
  ID_MAX_LENGTH: 191,
  PROVIDER_SUBJECT_MAX_LENGTH: 191,
} as const;

export const AUTH_INPUT_LIMITS = {
  LOGIN_IDENTIFIER_MAX_LENGTH: 320,
  PASSWORD_MAX_LENGTH: 128,
  DEVICE_NAME_MAX_LENGTH: 120,
  EXTERNAL_TOKEN_MAX_LENGTH: 4096,
} as const;

export const AUTH_PROVIDER_LIMITS = {
  PROVIDER_NAME_MAX_LENGTH: 50,
  PROVIDER_SUBJECT_MAX_LENGTH: 191,
} as const;

export const AUTH_CHALLENGE_LIMITS = {
  CHALLENGE_ID_MAX_LENGTH: 191,
  CHALLENGE_CODE_MAX_LENGTH: 20,
  CHALLENGE_PURPOSE_MAX_LENGTH: 50,
} as const;

export const AUTH_DEVICE_LIMITS = {
  USER_AGENT_MAX_LENGTH: 500,
  IP_ADDRESS_MAX_LENGTH: 64,
} as const;

export const AUTH_STORAGE_LIMITS = {
  HASH_MAX_LENGTH: 255,
  VERIFICATION_REF_MAX_LENGTH: 255,
} as const;

/**
 * Acciones auditables del submódulo Auth.
 * Se mantienen como string literals semánticos porque representan
 * eventos de auditoría del dominio, no enums de persistencia.
 */
export const AUTH_AUDIT_ACTIONS = {
  LOGIN_SUCCEEDED: 'auth.login.succeeded',
  LOGIN_FAILED: 'auth.login.failed',
  SESSION_ISSUED: 'auth.session.issued',
  SESSION_REFRESHED: 'auth.session.refreshed',
  SESSION_REVOKED: 'auth.session.revoked',
  SESSION_REFRESH_FAILED: 'auth.session.refresh.failed',
  LOGOUT_COMPLETED: 'auth.logout.completed',
  LOGOUT_ALL_COMPLETED: 'auth.logout_all.completed',
  VERIFICATION_REQUESTED: 'auth.verification.requested',
  VERIFICATION_SUCCEEDED: 'auth.verification.succeeded',
  VERIFICATION_FAILED: 'auth.verification.failed',
  PASSWORD_RESET_REQUESTED: 'auth.password_reset.requested',
  PASSWORD_RESET_COMPLETED: 'auth.password_reset.completed',
  PASSWORD_RESET_FAILED: 'auth.password_reset.failed',
  PROVIDER_LINKED: 'auth.provider.linked',
  PROVIDER_UNLINKED: 'auth.provider.unlinked',
} as const;

export const PASSWORD_RESET_ALLOWED_PROVIDERS = [
  AuthProvider.PASSWORD,
] as const;

export type AuthAuditAction =
  (typeof AUTH_AUDIT_ACTIONS)[keyof typeof AUTH_AUDIT_ACTIONS];

/**
 * Defaults canónicos alineados con Prisma enums.
 */
export const AUTH_DEFAULTS = {
  SESSION_STATUS: AuthSessionStatus.ISSUED,
  CHALLENGE_STATUS: AuthVerificationChallengeStatus.ISSUED,
} as const;

/**
 * Rule:
 * Prisma enums are the single source of truth for provider/session/challenge
 * states across Auth.
 */

export const LOGIN_ALLOWED_PROVIDERS = [
  AuthProvider.PASSWORD,
  AuthProvider.EMAIL_CODE,
  AuthProvider.PHONE_CODE,
  AuthProvider.GOOGLE,
  AuthProvider.APPLE,
] as const;
