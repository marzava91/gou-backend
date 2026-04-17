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
}
