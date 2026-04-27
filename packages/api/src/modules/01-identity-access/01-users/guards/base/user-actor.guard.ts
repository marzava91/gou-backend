// packages/api/src/modules/01-identity-and-access/01-users/guards/base/user-actor.guard.ts

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedActor } from '../../domain/types/user.types';
import { getRequestWithActor } from '../helpers/user-guard.helper';

@Injectable()
export abstract class UserActorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = getRequestWithActor(context);
    return this.handle(request.user!, request, context);
  }

  protected abstract handle(
    actor: AuthenticatedActor,
    request: { params?: Record<string, string | undefined> },
    context: ExecutionContext,
  ): boolean;
}
