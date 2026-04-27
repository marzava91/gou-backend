// packages/api/src/modules/01-identity-and-access/03-memberships/guards/membership-platform-admin.guard.ts

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class MembershipPlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const actor = request.user;

    const isPlatformAdmin = Boolean(actor?.isPlatformAdmin);

    if (!isPlatformAdmin) {
      throw new ForbiddenException('forbidden');
    }

    return true;
  }
}
