import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InvitationAccessPolicy } from '../policies/invitation-access.policy';
import type { AuthenticatedInvitationActor } from '../domain/types/invitation.types';

@Injectable()
export class RevokeInvitationGuard implements CanActivate {
  constructor(
    private readonly policy: InvitationAccessPolicy,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      user?: AuthenticatedInvitationActor;
    }>();

    const actor = req.user ?? null;

    if (!this.policy.canRevokeInvitation(actor)) {
      throw new ForbiddenException('forbidden_invitation_revoke');
    }

    return true;
  }
}