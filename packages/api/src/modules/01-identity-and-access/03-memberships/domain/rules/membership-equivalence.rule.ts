// packages/api/src/modules/01-identity-and-access/03-memberships/domain/rules/membership-equivalence.rule.ts

import { MembershipScopeType, MembershipStatus } from '@prisma/client';

export interface EquivalentMembershipKeyInput {
  userId: string;
  scopeType: MembershipScopeType;
  tenantId: string;
  storeId?: string | null;
}

const OPEN_STATUSES: MembershipStatus[] = [
  MembershipStatus.PENDING,
  MembershipStatus.ACTIVE,
  MembershipStatus.SUSPENDED,
];

export function buildEquivalentMembershipWhere(
  input: EquivalentMembershipKeyInput,
) {
  return {
    userId: input.userId,
    scopeType: input.scopeType,
    tenantId: input.tenantId,
    storeId: input.storeId ?? null,
    status: {
      in: OPEN_STATUSES,
    },
  };
}
