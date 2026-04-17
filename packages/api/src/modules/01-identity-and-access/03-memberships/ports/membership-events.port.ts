// packages/api/src/modules/01-identity-and-access/03-memberships/ports/membership-events.port.ts

import type { MembershipDomainEvent } from '../domain/events/membership.events';

export const MEMBERSHIP_EVENTS_PORT = Symbol('MEMBERSHIP_EVENTS_PORT');

export interface MembershipEventsPort {
  publish(input: {
    event: MembershipDomainEvent;
    payload: Record<string, unknown>;
    at?: Date;
  }): Promise<void>;
}
