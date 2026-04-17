// packages/api/src/modules/01-identity-and-access/01-users/domain/constants/user.constants.ts

/**
 * User Domain Constants
 *
 * TODO(identity-access):
 * - Evaluate splitting this file into:
 *   - user-field-limits.constants.ts
 *   - user-defaults.constants.ts
 *   - user-audit-actions.constants.ts
 *   - user-list.constants.ts
 * - Reassess if verification-related config belongs to domain or to application/service layer.
 *
 * NOTE:
 * This file currently aggregates multiple concerns for implementation speed.
 */

/**
 * Límites de longitud para campos de User
 */
export const USER_FIELD_LIMITS = {
  FIRST_NAME_MAX_LENGTH: 120,
  LAST_NAME_MAX_LENGTH: 120,
  DISPLAY_NAME_MAX_LENGTH: 180,
  AVATAR_URL_MAX_LENGTH: 2048,
  EMAIL_MAX_LENGTH: 320,
  PHONE_MAX_LENGTH: 40,
  ACTION_REASON_MAX_LENGTH: 500,
  SEARCH_QUERY_MAX_LENGTH: 120,
} as const;

/**
 * Valores por defecto
 */
export const USER_DEFAULTS = {
  DISPLAY_NAME_FALLBACK: 'User',
  ANONYMIZED_DISPLAY_NAME: 'Anonymized User',
} as const;

/**
 * Configuración de verificación de contacto
 */
export const USER_CONTACT_VERIFICATION_POLICY = {
  TOKEN_EXPIRATION_MINUTES: 15,
} as const;

export const USER_TOKEN_LIMITS = {
  VERIFICATION_TOKEN_MAX_LENGTH: 512,
} as const;

/**
 * Límites operativos
 */
export const USER_LIMITS = {
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
} as const;

export const USER_REGEX = {
  /**
   * Strict E.164 phone format:
   * - mandatory leading "+"
   * - country code required
   * - max 15 digits total
   * - first digit after "+" must be 1-9
   */
  E164_PHONE: /^\+[1-9]\d{7,14}$/,
} as const;

export const USER_CONTACT_CHANGE_POLICY = {
  TOKEN_EXPIRATION_MINUTES: 15,
  MAX_ACTIVE_PHONE_CHANGE_REQUESTS_PER_USER: 1,
} as const;

/**
 * Campos permitidos para ordenamiento en listados administrativos
 */
export const USER_LIST_SORT_FIELDS = {
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  DISPLAY_NAME: 'displayName',
  PRIMARY_EMAIL: 'primaryEmail',
  PRIMARY_PHONE: 'primaryPhone',
  STATUS: 'status',
} as const;

/**
 * Dirección de ordenamiento permitida
 */
export const USER_SORT_DIRECTIONS = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

/**
 * Acciones auditables (para consistencia)
 */
export const USER_AUDIT_ACTIONS = {
  CREATE: 'user.create',
  PROFILE_UPDATE: 'user.profile.update',
  SUSPEND: 'user.suspend',
  REACTIVATE: 'user.reactivate',
  DEACTIVATE: 'user.deactivate',
  ANONYMIZE: 'user.anonymize',
  EMAIL_CHANGE_REQUEST: 'user.primary_email_change.request',
  EMAIL_CHANGE_CONFIRM: 'user.primary_email_change.confirm',
  PHONE_CHANGE_REQUEST: 'user.primary_phone_change.request',
  PHONE_CHANGE_CONFIRM: 'user.primary_phone_change.confirm',
} as const;

export type UserAuditAction =
  (typeof USER_AUDIT_ACTIONS)[keyof typeof USER_AUDIT_ACTIONS];

export type UserListSortField =
  (typeof USER_LIST_SORT_FIELDS)[keyof typeof USER_LIST_SORT_FIELDS];

export type UserSortDirection =
  (typeof USER_SORT_DIRECTIONS)[keyof typeof USER_SORT_DIRECTIONS];
