import { Injectable } from '@nestjs/common';
import type { InvitationMembershipWriterPort } from '../../ports/invitation-membership-writer.port';

@Injectable()
export class NoopInvitationMembershipWriterAdapter implements InvitationMembershipWriterPort {
  async findEquivalentActiveMembership(): Promise<{
    membershipId: string;
  } | null> {
    return null;
  }

  async createMembershipFromInvitation(): Promise<{
    membershipId: string;
    status: string;
  }> {
    return {
      membershipId: 'membership_not_implemented',
      status: 'PENDING',
    };
  }
}
