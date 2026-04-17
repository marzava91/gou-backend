import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class InvitationPlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user?.isPlatformAdmin) {
      throw new ForbiddenException('forbidden_invitation_access');
    }
    return true;
  }
}
