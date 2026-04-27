// packages/api/src/modules/01-identity-and-access/07-access-resolution/domain/rules/access-grant-applicability.rule.ts

import { GrantTargetType } from '@prisma/client';
import { MembershipApplicableGrant } from '../types/access-resolution.types';
import { ACCESS_RESOLUTION_ACTIVE_GRANT_STATUSES } from '../constants/access-resolution.constants';

export function isGrantCurrentlyApplicable(
  grant: MembershipApplicableGrant,
  at: Date,
): boolean {
  if (!ACCESS_RESOLUTION_ACTIVE_GRANT_STATUSES.has(grant.status)) {
    return false;
  }

  if (grant.validFrom && grant.validFrom > at) {
    return false;
  }

  if (grant.validUntil && grant.validUntil < at) {
    return false;
  }

  return true;
}

export function grantMatchesRequestedTarget(
  grant: MembershipApplicableGrant,
  input: {
    capabilityKey: string | null;
    resourceKey: string | null;
    actionKey: string | null;
  },
): boolean {
  if (grant.targetType === GrantTargetType.CAPABILITY) {
    return grant.capabilityKey === input.capabilityKey;
  }

  return (
    grant.targetType === GrantTargetType.RESOURCE_ACTION &&
    grant.resourceKey === input.resourceKey &&
    grant.actionKey === input.actionKey
  );
}