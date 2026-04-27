import type { AccessResolutionDomainEvent } from '../domain/events/access-resolution.events';

export const ACCESS_RESOLUTION_EVENTS_PORT = Symbol('ACCESS_RESOLUTION_EVENTS_PORT');

export interface AccessResolutionEventsPort {
  publish(input: {
    eventName: AccessResolutionDomainEvent;
    payload: Record<string, unknown>;
  }): Promise<void>;
}