// packages/api/src/modules/01-identity-and-access/03-memberships/domain/types/active-membership-context.types.ts

import {
  MembershipScopeType,
  OperationalSurface,
  MembershipStatus,
} from '@prisma/client';

export interface ResolvedActiveMembershipContext {
  membershipId: string;
  userId: string;
  surface: OperationalSurface;

  scopeType: MembershipScopeType;
  tenantId: string;
  storeId?: string | null;

  status: MembershipStatus;
  updatedAt: Date;
}

export interface SetActiveMembershipContextInput {
  userId: string;
  membershipId: string;
  surface: OperationalSurface;
}
