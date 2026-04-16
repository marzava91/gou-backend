import { Injectable } from '@nestjs/common';
import { GrantResponseDto } from '../dto/responses/grant-response.dto';
import { GrantSummaryResponseDto } from '../dto/responses/grant-summary-response.dto';

@Injectable()
export class GrantResponseMapper {
  toGrantResponse(grant: any): GrantResponseDto {
    return {
      id: grant.id,
      membershipId: grant.membershipId,
      effect: grant.effect,
      targetType: grant.targetType,
      capabilityKey: grant.capabilityKey ?? null,
      resourceKey: grant.resourceKey ?? null,
      actionKey: grant.actionKey ?? null,
      status: grant.status,
      validFrom: grant.validFrom ?? null,
      validUntil: grant.validUntil ?? null,
      creationReason: grant.creationReason ?? null,
      revocationReason: grant.revocationReason ?? null,
      createdBy: grant.createdBy ?? null,
      revokedBy: grant.revokedBy ?? null,
      activatedAt: grant.activatedAt ?? null,
      expiredAt: grant.expiredAt ?? null,
      revokedAt: grant.revokedAt ?? null,
      version: grant.version,
      createdAt: grant.createdAt,
      updatedAt: grant.updatedAt,
    };
  }

  toGrantSummaryResponse(grant: any): GrantSummaryResponseDto {
    return {
      id: grant.id,
      membershipId: grant.membershipId,
      effect: grant.effect,
      targetType: grant.targetType,
      capabilityKey: grant.capabilityKey ?? null,
      resourceKey: grant.resourceKey ?? null,
      actionKey: grant.actionKey ?? null,
      status: grant.status,
      validFrom: grant.validFrom ?? null,
      validUntil: grant.validUntil ?? null,
      createdAt: grant.createdAt,
      updatedAt: grant.updatedAt,
    };
  }
}