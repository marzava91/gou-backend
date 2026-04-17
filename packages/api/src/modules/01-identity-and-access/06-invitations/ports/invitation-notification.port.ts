export const INVITATION_NOTIFICATION_PORT = Symbol(
  'INVITATION_NOTIFICATION_PORT',
);

export interface InvitationNotificationPort {
  sendInvitation(input: {
    invitationId: string;
    recipientType: string;
    recipientValue: string;
    token: string;
    expiresAt: Date;
  }): Promise<void>;
}
