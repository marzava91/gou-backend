import { Injectable } from '@nestjs/common';
import type { InvitationUserResolutionPort } from '../../ports/invitation-user-resolution.port';
import type { ResolveInvitationUserResult } from '../../domain/types/invitation.types';

@Injectable()
export class NoopInvitationUserResolutionAdapter implements InvitationUserResolutionPort {
  async resolveOrCreateUserByRecipient(): Promise<ResolveInvitationUserResult> {
    return {
      userId: 'user_not_implemented',
      created: false,
    };
  }
}
