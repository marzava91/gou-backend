// packages/api/src/modules/01-identity-and-access/07-access-resolution/dto/responses/effective-permission.response.dto.ts

import { MembershipScopeType, OperationalSurface } from '@prisma/client';

export class EffectivePermissionResponseDto {
  surface!: OperationalSurface;

  membership!: {
    membershipId: string;
    scopeType: MembershipScopeType;
    tenantId: string;
    storeId: string | null;
  };

  capabilityKeys!: string[];

  evaluatedAt!: Date;
}