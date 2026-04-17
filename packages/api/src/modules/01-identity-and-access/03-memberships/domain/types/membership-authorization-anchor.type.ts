// domain/types/membership-authorization-anchor.type.ts

import { MembershipScopeType, MembershipStatus } from '@prisma/client';

export type MembershipAuthorizationAnchor = {
  membershipId: string;
  userId: string;
  scopeType: MembershipScopeType;
  tenantId: string;
  storeId: string | null;
  status: MembershipStatus;
};
