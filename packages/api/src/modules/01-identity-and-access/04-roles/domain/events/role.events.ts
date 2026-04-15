export const RoleDomainEvents = {
  ROLE_CREATED: 'role_created',
  ROLE_UPDATED: 'role_updated',
  ROLE_RETIRED: 'role_retired',
  ROLE_ASSIGNED: 'role_assigned',
  ROLE_ASSIGNMENT_REVOKED: 'role_assignment_revoked',
} as const;

export type RoleDomainEventName =
  (typeof RoleDomainEvents)[keyof typeof RoleDomainEvents];