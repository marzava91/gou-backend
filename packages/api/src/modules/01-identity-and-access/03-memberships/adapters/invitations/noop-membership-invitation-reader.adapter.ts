// packages/api/src/modules/01-identity-and-access/03-memberships/adapters/invitations/noop-membership-invitation-reader.adapter.ts

import { Injectable } from '@nestjs/common';
import { MembershipInvitationReaderPort } from '../../ports/membership-invitation-reader.port';

@Injectable()
export class NoopMembershipInvitationReaderAdapter
  implements MembershipInvitationReaderPort
{
  async findAcceptedInvitationById(): Promise<null> {
    return null;
  }
}