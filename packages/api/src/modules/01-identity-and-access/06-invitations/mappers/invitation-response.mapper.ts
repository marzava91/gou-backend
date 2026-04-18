import { Injectable } from '@nestjs/common';
import { Invitation } from '@prisma/client';
import { InvitationResponseDto } from '../dto/responses/invitation-response.dto';
import { InvitationPublicResponseDto } from '../dto/responses/invitation-public-response.dto';

@Injectable()
export class InvitationResponseMapper {
  toResponse(entity: Invitation): InvitationResponseDto {
    return {
      id: entity.id,
      recipientType: entity.recipientType,
      recipientValue: entity.recipientValue,
      scopeType: entity.scopeType,
      tenantId: entity.tenantId,
      storeId: entity.storeId,
      proposedRoleKey: entity.proposedRoleKey,
      status: entity.status,
      expiresAt: entity.expiresAt,
      membershipId: entity.membershipId,
      sentAt: entity.sentAt,
      acceptedAt: entity.acceptedAt,
      declinedAt: entity.declinedAt,
      revokedAt: entity.revokedAt,
      canceledAt: entity.canceledAt,
      expiredAt: entity.expiredAt,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  toPublicResponse(entity: Invitation): InvitationPublicResponseDto {
    return {
      id: entity.id,
      recipientType: entity.recipientType,
      scopeType: entity.scopeType,
      tenantId: entity.tenantId,
      storeId: entity.storeId,
      proposedRoleKey: entity.proposedRoleKey,
      status: entity.status,
      expiresAt: entity.expiresAt,
      membershipId: entity.membershipId,
      sentAt: entity.sentAt,
      acceptedAt: entity.acceptedAt,
      declinedAt: entity.declinedAt,
      revokedAt: entity.revokedAt,
      canceledAt: entity.canceledAt,
      expiredAt: entity.expiredAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}