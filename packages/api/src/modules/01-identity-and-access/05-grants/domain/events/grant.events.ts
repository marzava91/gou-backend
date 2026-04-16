export const GrantDomainEvents = {
  GRANT_CREATED: 'grant_created',
  GRANT_REVOKED: 'grant_revoked',
  GRANT_EXPIRED: 'grant_expired',
  EFFECTIVE_PERMISSIONS_CHANGED: 'effective_permissions_changed',
} as const;

export type GrantDomainEvent =
  (typeof GrantDomainEvents)[keyof typeof GrantDomainEvents];