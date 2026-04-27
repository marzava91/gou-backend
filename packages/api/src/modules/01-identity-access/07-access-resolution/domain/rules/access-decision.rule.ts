// packages/api/src/modules/01-identity-and-access/07-access-resolution/domain/rules/access-decision.rule.ts

import { GrantEffect } from '@prisma/client';
import {
  MembershipApplicableGrant,
  MembershipRoleCapability,
} from '../types/access-resolution.types';

export function hasBaselineCapability(
  roleCapabilities: MembershipRoleCapability[],
  capabilityKey: string | null,
): boolean {
  if (!capabilityKey) {
    return false;
  }

  return roleCapabilities.some((item) => item.capabilityKey === capabilityKey);
}

export function resolveGrantPrecedence(grants: MembershipApplicableGrant[]): {
  allowGrantIds: string[];
  denyGrantIds: string[];
  allowedByGrant: boolean;
  deniedByGrant: boolean;
} {
  const allowGrantIds = grants
    .filter((item) => item.effect === GrantEffect.ALLOW)
    .map((item) => item.id);

  const denyGrantIds = grants
    .filter((item) => item.effect === GrantEffect.DENY)
    .map((item) => item.id);

  return {
    allowGrantIds,
    denyGrantIds,
    allowedByGrant: allowGrantIds.length > 0,
    deniedByGrant: denyGrantIds.length > 0,
  };
}