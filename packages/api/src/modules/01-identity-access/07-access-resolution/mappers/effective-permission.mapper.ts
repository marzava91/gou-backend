// packages/api/src/modules/01-identity-and-access/07-access-resolution/mappers/effective-permission.mapper.ts

import { Injectable } from '@nestjs/common';
import { EffectivePermissionResponseDto } from '../dto/responses/effective-permission.response.dto';
import { AuthorizationMembershipAnchor } from '../domain/types/access-resolution.types';
import { OperationalSurface } from '@prisma/client';

@Injectable()
export class EffectivePermissionMapper {
  toResponse(input: {
    surface: OperationalSurface;
    membership: AuthorizationMembershipAnchor;
    capabilityKeys: string[];
    evaluatedAt: Date;
  }): EffectivePermissionResponseDto {
    return {
      surface: input.surface,
      membership: {
        membershipId: input.membership.membershipId,
        scopeType: input.membership.scopeType,
        tenantId: input.membership.tenantId,
        storeId: input.membership.storeId,
      },
      capabilityKeys: input.capabilityKeys,
      evaluatedAt: input.evaluatedAt,
    };
  }
}