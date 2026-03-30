// packages/api/src/modules/01-identity-and-access/01-users/guards/user-self-or-admin.guard.ts

import {
  ExecutionContext,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedActor } from '../domain/types/user.types';
import { UserAccessPolicy } from '../policies/user-access.policy';
import { UserActorGuard } from './base/user-actor.guard';
import { USER_TARGET_PARAM_KEY } from './decorators/user-target-param.decorator';
import { ForbiddenUserAccessError } from '../domain/errors/user.errors';

@Injectable()
export class UserSelfOrAdminGuard extends UserActorGuard {
  constructor(
    private readonly reflector: Reflector,
    private readonly userAccessPolicy: UserAccessPolicy,
  ) {
    super();
  }

  protected handle(
    actor: AuthenticatedActor,
    request: { params?: Record<string, string | undefined> },
    context: ExecutionContext,
  ): boolean {
    const paramName =
      this.reflector.getAllAndOverride<string>(USER_TARGET_PARAM_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'id';

    const targetUserId = request.params?.[paramName];

    if (!targetUserId) {
      throw new BadRequestException('target_user_id_required');
    }

    const allowed = this.userAccessPolicy.canReadUser(actor, targetUserId);

    if (!allowed) {
      throw new ForbiddenUserAccessError();
    }

    return true;
  }
}