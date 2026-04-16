import { GrantEventEnvelope } from '../domain/types/grant.types';

export const GRANT_EVENTS_PORT = Symbol('GRANT_EVENTS_PORT');

export interface GrantEventsPort {
  publish(event: GrantEventEnvelope): Promise<void>;
}