// packages\api\src\modules\01-identity-and-access\02-auth\ports\auth-events.port.ts

import type { AuthDomainEvent } from '../domain/events/auth.events';

export const AUTH_EVENTS_PORT = Symbol('AUTH_EVENTS_PORT');

export interface AuthEventsPort {
  publish(params: {
    eventName: AuthDomainEvent;
    payload: Record<string, unknown>;
  }): Promise<void>;
}
