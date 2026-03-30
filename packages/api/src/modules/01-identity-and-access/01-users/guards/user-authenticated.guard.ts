// packages/api/src/modules/01-identity-and-access/01-users/guards/user-authenticated.guard.ts

import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedActor } from '../domain/types/user.types';
import { UserActorGuard } from './base/user-actor.guard';

@Injectable()
export class UserAuthenticatedGuard extends UserActorGuard {
  protected handle(
    _actor: AuthenticatedActor,
    _request: { params?: Record<string, string | undefined> },
    _context: ExecutionContext,
  ): boolean {
    return true;
  }
}