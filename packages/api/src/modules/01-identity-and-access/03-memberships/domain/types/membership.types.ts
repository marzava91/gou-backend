// packages/api/src/modules/01-identity-and-access/03-memberships/domain/types/membership.types.ts

import { MembershipScopeType } from '@prisma/client';

export interface MembershipScope {
  scopeType: MembershipScopeType;
  tenantId: string;
  storeId?: string | null;
}

export interface EquivalentMembershipKey {
  userId: string;
  scopeType: MembershipScopeType;
  tenantId: string;
  storeId?: string | null;
}

export type MembershipLifecycleAction =
  | 'create'
  | 'activate'
  | 'suspend'
  | 'revoke'
  | 'expire';