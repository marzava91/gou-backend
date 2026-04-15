// packages/api/src/modules/01-identity-and-access/03-memberships/mappers/membership-response.mapper.ts

import { Injectable } from '@nestjs/common';

import { MembershipSummaryDto } from '../dto/responses/membership-summary.dto';
import { MembershipResponseDto } from '../dto/responses/membership-response.dto';
import { ActiveMembershipContextResponseDto } from '../dto/responses/active-membership-context-response.dto';

@Injectable()
export class MembershipResponseMapper {
  toSummaryDto(membership: {
    id: string;
    userId: string;
    scopeType: MembershipSummaryDto['scopeType'];
    tenantId: string;
    storeId: string | null;
    status: MembershipSummaryDto['status'];
    effectiveFrom: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): MembershipSummaryDto {
    return {
      id: membership.id,
      userId: membership.userId,
      scopeType: membership.scopeType,
      tenantId: membership.tenantId,
      storeId: membership.storeId,
      status: membership.status,
      effectiveFrom: membership.effectiveFrom,
      expiresAt: membership.expiresAt,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    };
  }

  toDetailDto(membership: {
    id: string;
    userId: string;
    scopeType: MembershipResponseDto['scopeType'];
    tenantId: string;
    storeId: string | null;
    status: MembershipResponseDto['status'];
    effectiveFrom: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    invitationId: string | null;
    activatedAt: Date | null;
    suspendedAt: Date | null;
    revokedAt: Date | null;
    expiredAt: Date | null;
    reason: string | null;
    version: number;
  }): MembershipResponseDto {
    return {
      id: membership.id,
      userId: membership.userId,
      scopeType: membership.scopeType,
      tenantId: membership.tenantId,
      storeId: membership.storeId,
      status: membership.status,
      effectiveFrom: membership.effectiveFrom,
      expiresAt: membership.expiresAt,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
      invitationId: membership.invitationId,
      activatedAt: membership.activatedAt,
      suspendedAt: membership.suspendedAt,
      revokedAt: membership.revokedAt,
      expiredAt: membership.expiredAt,
      reason: membership.reason,
      version: membership.version,
    };
  }

  toActiveContextDto(context: {
    membershipId: string;
    userId: string;
    surface: ActiveMembershipContextResponseDto['surface'];
    scopeType: ActiveMembershipContextResponseDto['scopeType'];
    tenantId: string;
    storeId: string | null;
    status: ActiveMembershipContextResponseDto['status'];
    updatedAt: Date;
  }): ActiveMembershipContextResponseDto {
    return {
      membershipId: context.membershipId,
      userId: context.userId,
      surface: context.surface,
      scopeType: context.scopeType,
      tenantId: context.tenantId,
      storeId: context.storeId,
      status: context.status,
      updatedAt: context.updatedAt,
    };
  }
}