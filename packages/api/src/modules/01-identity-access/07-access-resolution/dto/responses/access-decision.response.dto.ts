// packages/api/src/modules/01-identity-and-access/07-access-resolution/dto/responses/access-decision.response.dto.ts

import { MembershipScopeType, OperationalSurface } from '@prisma/client';
import { AccessReasonCode } from '../../domain/types/access-resolution.types';

export class AccessDecisionResponseDto {
  allowed!: boolean;
  reasonCode!: AccessReasonCode;

  surface!: OperationalSurface;

  capabilityKey!: string | null;
  resourceKey!: string | null;
  actionKey!: string | null;

  membership!: {
    membershipId: string;
    scopeType: MembershipScopeType;
    tenantId: string;
    storeId: string | null;
  } | null;

  explanation!: {
    baselineMatchedCapability: boolean;
    matchedAllowGrantIds: string[];
    matchedDenyGrantIds: string[];
  };

  evaluatedAt!: Date;
}