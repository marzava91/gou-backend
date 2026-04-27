// packages/api/src/modules/01-identity-and-access/07-access-resolution/domain/events/access-resolution.events.ts

export const AccessResolutionDomainEvents = {
  ACCESS_EVALUATED: 'access_evaluated',
  ACCESS_CONTEXT_RESOLVED: 'access_context_resolved',
  EFFECTIVE_PERMISSIONS_COMPUTED: 'effective_permissions_computed',
} as const;

export type AccessResolutionDomainEvent =
  (typeof AccessResolutionDomainEvents)[keyof typeof AccessResolutionDomainEvents];