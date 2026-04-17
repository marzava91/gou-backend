import { InvitationRecipientType } from '@prisma/client';
import type { ResolveInvitationUserResult } from '../domain/types/invitation.types';

export const INVITATION_USER_RESOLUTION_PORT = Symbol(
  'INVITATION_USER_RESOLUTION_PORT',
);

export interface InvitationUserResolutionPort {
  resolveOrCreateUserByRecipient(input: {
    recipientType: InvitationRecipientType;
    recipientValue: string;
  }): Promise<ResolveInvitationUserResult>;
}
