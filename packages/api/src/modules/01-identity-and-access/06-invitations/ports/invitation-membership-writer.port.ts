import type {
  CreateMembershipFromInvitationInput,
  CreatedMembershipFromInvitation,
} from '../domain/types/invitation.types';

export const INVITATION_MEMBERSHIP_WRITER_PORT = Symbol(
  'INVITATION_MEMBERSHIP_WRITER_PORT',
);

export interface InvitationMembershipWriterPort {
  findEquivalentActiveMembership(input: {
    userId: string;
    scopeType: string;
    tenantId: string;
    storeId?: string | null;
  }): Promise<{ membershipId: string } | null>;

  createMembershipFromInvitation(
    input: CreateMembershipFromInvitationInput,
  ): Promise<CreatedMembershipFromInvitation>;
}
