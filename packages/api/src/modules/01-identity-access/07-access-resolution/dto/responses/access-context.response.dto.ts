// packages/api/src/modules/01-identity-and-access/07-access-resolution/dto/responses/access-context.response.dto.ts

import {
  AuthSessionStatus,
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
} from '@prisma/client';

export class AccessContextResponseDto {
  session!: {
    sessionId: string;
    userId: string;
    status: AuthSessionStatus;
  };

  activeContext!: {
    membershipId: string;
    surface: OperationalSurface;
    scopeType: MembershipScopeType;
    tenantId: string;
    storeId: string | null;
    status: MembershipStatus;
    updatedAt: Date;
  } | null;

  membership!: {
    membershipId: string;
    scopeType: MembershipScopeType;
    tenantId: string;
    storeId: string | null;
    status: MembershipStatus;
  } | null;

  effectiveCapabilityKeys!: string[];
  evaluatedAt!: Date;
}