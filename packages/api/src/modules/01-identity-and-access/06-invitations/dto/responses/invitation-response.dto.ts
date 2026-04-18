import {
  InvitationRecipientType,
  InvitationStatus,
  MembershipScopeType,
} from '@prisma/client';

export class InvitationResponseDto {
  id!: string;
  recipientType!: InvitationRecipientType;
  recipientValue!: string;
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
  createdBy!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}