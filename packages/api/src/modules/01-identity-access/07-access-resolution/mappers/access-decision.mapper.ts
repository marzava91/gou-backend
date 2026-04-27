// packages/api/src/modules/01-identity-and-access/07-access-resolution/mappers/access-decision.mapper.ts

import { Injectable } from '@nestjs/common';
import { AccessDecision } from '../domain/types/access-resolution.types';
import { AccessDecisionResponseDto } from '../dto/responses/access-decision.response.dto';

@Injectable()
export class AccessDecisionMapper {
  toResponse(input: AccessDecision): AccessDecisionResponseDto {
    return {
      allowed: input.allowed,
      reasonCode: input.reasonCode,
      surface: input.surface,
      capabilityKey: input.capabilityKey,
      resourceKey: input.resourceKey,
      actionKey: input.actionKey,
      membership: input.membership
        ? {
            membershipId: input.membership.membershipId,
            scopeType: input.membership.scopeType,
            tenantId: input.membership.tenantId,
            storeId: input.membership.storeId,
          }
        : null,
      explanation: input.explanation,
      evaluatedAt: input.evaluatedAt,
    };
  }
}