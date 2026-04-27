import { Injectable } from '@nestjs/common';
import type { RoleActor } from '../domain/types/role.types';

@Injectable()
export class RoleAccessPolicy {
  canManageRoleCatalog(actor: RoleActor): boolean {
    return Boolean(actor.isPlatformAdmin);
  }

  canReadMembershipRoles(actor: RoleActor, targetUserId: string): boolean {
    return Boolean(actor.isPlatformAdmin) || actor.userId === targetUserId;
  }
}
