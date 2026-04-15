export const ROLE_EVENTS_PORT = Symbol('ROLE_EVENTS_PORT');

export interface RoleEventsPort {
  publish(input: {
    eventName: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}