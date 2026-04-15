// packages/api/src/modules/01-identity-and-access/03-memberships/ports/membership-invitation-reader.port.ts

export const MEMBERSHIP_INVITATION_READER_PORT = Symbol(
  'MEMBERSHIP_INVITATION_READER_PORT',
);

export interface MembershipInvitationReaderPort {
  findAcceptedInvitationById(input: {
    invitationId: string;
  }): Promise<{
    id: string;
    userId: string;
    tenantId: string;
    storeId?: string | null;
    roleHint?: string | null;
    acceptedAt: Date;
  } | null>;
}