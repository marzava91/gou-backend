// packages/api/src/modules/01-identity-and-access/03-memberships/policies/membership-access.policy.ts

import { Injectable } from '@nestjs/common';

@Injectable()
export class MembershipAccessPolicy {
  canReadMembership(input: {
    actorId?: string | null;
    targetUserId: string;
    isPlatformAdmin?: boolean;
  }): boolean {
    if (input.isPlatformAdmin) {
      return true;
    }

    return Boolean(input.actorId) && input.actorId === input.targetUserId;
  }

  canListMemberships(input: {
    isPlatformAdmin?: boolean;
  }): boolean {
    return Boolean(input.isPlatformAdmin);
  }

  canCreateMembership(input: {
    isPlatformAdmin?: boolean;
  }): boolean {
    return Boolean(input.isPlatformAdmin);
  }

  canChangeMembershipLifecycle(input: {
    isPlatformAdmin?: boolean;
  }): boolean {
    return Boolean(input.isPlatformAdmin);
  }

  canSetOwnActiveContext(input: {
    actorId?: string | null;
    userId: string;
  }): boolean {
    return Boolean(input.actorId) && input.actorId === input.userId;
  }
}