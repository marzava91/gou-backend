// packages/api/src/modules/01-identity-and-access/03-memberships/domain/events/membership.events.ts

export const MembershipDomainEvents = {
  MEMBERSHIP_CREATED: 'membership_created',
  MEMBERSHIP_ACTIVATED: 'membership_activated',
  MEMBERSHIP_SUSPENDED: 'membership_suspended',
  MEMBERSHIP_REVOKED: 'membership_revoked',
  MEMBERSHIP_EXPIRED: 'membership_expired',
  ACTIVE_MEMBERSHIP_CONTEXT_CHANGED: 'active_membership_context_changed',
  ACTIVE_MEMBERSHIP_CONTEXT_CLEARED: 'active_membership_context_cleared',
} as const;

export type MembershipDomainEvent =
  (typeof MembershipDomainEvents)[keyof typeof MembershipDomainEvents];
