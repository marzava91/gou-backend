// packages/api/src/modules/01-identity-and-access/03-memberships/dto/responses/active-membership-context-response.dto.ts

import {
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
} from '@prisma/client';

export class ActiveMembershipContextResponseDto {
  membershipId!: string;
  userId!: string;
  surface!: OperationalSurface;

  scopeType!: MembershipScopeType;
  tenantId!: string;
  storeId!: string | null;

  status!: MembershipStatus;
  updatedAt!: Date;
}