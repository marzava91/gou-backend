export const INVITATION_EVENTS_PORT = Symbol('INVITATION_EVENTS_PORT');

export interface InvitationEventsPort {
  publish(event: {
    eventName: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}
