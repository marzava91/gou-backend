// packages/api/src/modules/01-identity-and-access/07-access-resolution/mappers/access-context.mapper.ts

import { Injectable } from '@nestjs/common';
import { ResolvedAccessContext } from '../domain/types/access-resolution.types';
import { AccessContextResponseDto } from '../dto/responses/access-context.response.dto';

@Injectable()
export class AccessContextMapper {
  toResponse(input: ResolvedAccessContext): AccessContextResponseDto {
    return {
      session: {
        sessionId: input.session.sessionId,
        userId: input.session.userId,
        status: input.session.status,
      },
      activeContext: input.activeContext
        ? {
            membershipId: input.activeContext.membershipId,
            surface: input.activeContext.surface,
            scopeType: input.activeContext.scopeType,
            tenantId: input.activeContext.tenantId,
            storeId: input.activeContext.storeId,
            status: input.activeContext.status,
            updatedAt: input.activeContext.updatedAt,
          }
        : null,
      membership: input.membership
        ? {
            membershipId: input.membership.membershipId,
            scopeType: input.membership.scopeType,
            tenantId: input.membership.tenantId,
            storeId: input.membership.storeId,
            status: input.membership.status,
          }
        : null,
      effectiveCapabilityKeys: input.effectiveCapabilityKeys,
      evaluatedAt: input.evaluatedAt,
    };
  }
}