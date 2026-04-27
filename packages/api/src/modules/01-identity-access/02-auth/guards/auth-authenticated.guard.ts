// packages\api\src\modules\01-identity-and-access\02-auth\guards\auth-authenticated.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedAuthActor } from '../domain/types/auth.types';

@Injectable()
export class AuthAuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const actor = request.user as AuthenticatedAuthActor | undefined;

    this.assertActor(actor);

    return true;
  }

  private assertActor(
    actor?: AuthenticatedAuthActor,
  ): asserts actor is AuthenticatedAuthActor {
    if (!actor) {
      throw new UnauthorizedException('Missing authentication context');
    }

    if (!actor.userId || !actor.sessionId) {
      throw new UnauthorizedException('Invalid authentication context');
    }
  }
}

/**
 * MVP structural guard
 *
 * This guard does NOT perform cryptographic or stateful authentication validation.
 * Its responsibility in the current phase is only to enforce that protected Auth
 * endpoints receive a previously resolved AuthenticatedAuthActor in request.user.
 *
 * Real actor authentication is intentionally deferred to infrastructure, such as:
 * - auth middleware
 * - token validation interceptor
 * - API gateway / edge auth layer
 *
 * That upstream layer is responsible for:
 * 1. validating the access token or upstream credential;
 * 2. resolving the authenticated actor from the token;
 * 3. populating request.user with a trusted AuthenticatedAuthActor;
 * 4. optionally verifying session existence/state in persistence.
 *
 * Future hardening may additionally enforce:
 * - session existence in auth_sessions
 * - session state (not revoked / expired / logged out)
 * - optional session binding (IP / userAgent / deviceName)
 */
