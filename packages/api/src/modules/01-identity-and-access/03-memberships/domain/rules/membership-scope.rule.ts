// packages/api/src/modules/01-identity-and-access/03-memberships/domain/rules/membership-scope.rule.ts

import { MembershipScopeType } from '@prisma/client';

export interface MembershipScopeInput {
  scopeType: MembershipScopeType;
  tenantId: string;
  storeId?: string | null;
}

export function validateMembershipScope(input: MembershipScopeInput): boolean {
  if (!input.tenantId?.trim()) {
    return false;
  }

  if (input.scopeType === MembershipScopeType.TENANT) {
    return !input.storeId;
  }

  if (input.scopeType === MembershipScopeType.STORE) {
    return Boolean(input.storeId?.trim());
  }

  return false;
}