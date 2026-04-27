// packages/api/src/modules/01-identity-and-access/01-users/guards/user-platform-admin.guard.ts

import { ExecutionContext, Injectable } from '@nestjs/common';
import { UserActorGuard } from './base/user-actor.guard';
import { AuthenticatedActor } from '../domain/types/user.types';
import { UserAccessPolicy } from '../policies/user-access.policy';
import { ForbiddenUserAccessError } from '../domain/errors/user.errors';

@Injectable()
export class UserPlatformAdminGuard extends UserActorGuard {
  constructor(private readonly userAccessPolicy: UserAccessPolicy) {
    super();
  }

  protected handle(
    actor: AuthenticatedActor,
    _request: { params?: Record<string, string | undefined> },
    _context: ExecutionContext,
  ): boolean {
    if (!this.userAccessPolicy.canManageUserLifecycle(actor)) {
      throw new ForbiddenUserAccessError();
    }

    return true;
  }
}
