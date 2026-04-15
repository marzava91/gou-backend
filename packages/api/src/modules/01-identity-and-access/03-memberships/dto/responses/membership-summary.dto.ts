// packages/api/src/modules/01-identity-and-access/03-memberships/dto/responses/membership-summary.dto.ts

import {
  MembershipScopeType,
  MembershipStatus,
} from '@prisma/client';

export class MembershipSummaryDto {
  id!: string;
  userId!: string;

  scopeType!: MembershipScopeType;
  tenantId!: string;
  storeId!: string | null;

  status!: MembershipStatus;

  effectiveFrom!: Date | null;
  expiresAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}