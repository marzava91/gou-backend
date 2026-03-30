// packages\api\src\modules\01-identity-and-access\01-users\ports\user-events.port.ts

import { UserDomainEventName } from '../domain/events/user.events';

export const USER_EVENTS_PORT = Symbol('USER_EVENTS_PORT');

export interface UserEventsPort {
  publish(
    eventName: UserDomainEventName,
    payload: Record<string, unknown>,
  ): Promise<void>;
}