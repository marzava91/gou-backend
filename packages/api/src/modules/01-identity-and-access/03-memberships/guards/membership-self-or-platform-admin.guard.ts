// packages\api\src\modules\01-identity-and-access\03-memberships\guards\membership-self-or-platform-admin.guard.ts

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class MembershipSelfOrPlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const actor = request.user;

    const actorId = actor?.userId ?? null;
    const isPlatformAdmin = Boolean(actor?.isPlatformAdmin);

    const targetUserId =
      request.params?.userId ??
      request.body?.userId ??
      actorId;

    if (isPlatformAdmin) {
      return true;
    }

    if (actorId && targetUserId && actorId === targetUserId) {
      return true;
    }

    throw new ForbiddenException('forbidden');
  }
}