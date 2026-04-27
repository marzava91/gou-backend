import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AccessResolutionAuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const actor = request.user;

    if (!actor?.userId || !actor?.sessionId) {
      throw new UnauthorizedException('auth_session_invalid');
    }

    return true;
  }
}