// packages\api\src\modules\01-identity-and-access\01-users\policies\user-access.policy.ts

import { Injectable } from '@nestjs/common';
import { AuthenticatedActor } from '../domain/types/user.types';

@Injectable()
export class UserAccessPolicy {
  canReadUser(actor: AuthenticatedActor, targetUserId: string): boolean {
    if (actor.isPlatformAdmin) return true;
    return actor.userId === targetUserId;
  }

  canUpdateOwnProfile(
    actor: AuthenticatedActor,
    targetUserId: string,
  ): boolean {
    return actor.userId === targetUserId;
  }

  canManageUserLifecycle(actor: AuthenticatedActor): boolean {
    return !!actor.isPlatformAdmin;
  }

  canRequestOwnContactChange(
    actor: AuthenticatedActor,
    targetUserId: string,
  ): boolean {
    return actor.userId === targetUserId;
  }
}
