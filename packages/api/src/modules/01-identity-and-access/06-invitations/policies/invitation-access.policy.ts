import { Injectable } from '@nestjs/common';
import type { AuthenticatedInvitationActor } from '../domain/types/invitation.types';

@Injectable()
export class InvitationAccessPolicy {
  canManageInvitations(
    actor: AuthenticatedInvitationActor | null | undefined,
  ): boolean {
    return !!actor?.isPlatformAdmin;
  }

  canReadInvitation(
    actor: AuthenticatedInvitationActor | null | undefined,
  ): boolean {
    return !!actor?.isPlatformAdmin;
  }
}
