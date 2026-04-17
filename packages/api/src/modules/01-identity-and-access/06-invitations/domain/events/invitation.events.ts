export const InvitationDomainEvents = {
  INVITATION_CREATED: 'invitation_created',
  INVITATION_SENT: 'invitation_sent',
  INVITATION_RESENT: 'invitation_resent',
  INVITATION_REVOKED: 'invitation_revoked',
  INVITATION_CANCELED: 'invitation_canceled',
  INVITATION_DECLINED: 'invitation_declined',
  INVITATION_ACCEPTED: 'invitation_accepted',
  INVITATION_EXPIRED: 'invitation_expired',
  INVITATION_CONVERTED_TO_MEMBERSHIP: 'invitation_converted_to_membership',
} as const;

export type InvitationDomainEventName =
  (typeof InvitationDomainEvents)[keyof typeof InvitationDomainEvents];
