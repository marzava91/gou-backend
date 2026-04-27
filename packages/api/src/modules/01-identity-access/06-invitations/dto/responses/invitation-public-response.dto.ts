import {
  InvitationRecipientType,
  InvitationStatus,
  MembershipScopeType,
} from '@prisma/client';

export class InvitationPublicResponseDto {
  id!: string;
  recipientType!: InvitationRecipientType;
  scopeType!: MembershipScopeType;
  tenantId!: string;
  storeId!: string | null;
  proposedRoleKey!: string | null;
  status!: InvitationStatus;
  expiresAt!: Date;
  membershipId!: string | null;
  sentAt!: Date | null;
  acceptedAt!: Date | null;
  declinedAt!: Date | null;
  revokedAt!: Date | null;
  canceledAt!: Date | null;
  expiredAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}