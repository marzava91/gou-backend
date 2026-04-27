import {
  InvitationRecipientType,
  InvitationStatus,
  MembershipScopeType,
} from '@prisma/client';

export interface AuthenticatedInvitationActor {
  userId: string;
  isPlatformAdmin?: boolean;
  tenantIds?: string[];
  storeIds?: string[];
}

export interface InvitationTokenPayload {
  invitationId: string;
  token: string;
  expiresAt: Date;
}

export interface ResolveInvitationUserResult {
  userId: string;
  created: boolean;
}

export interface CreateMembershipFromInvitationInput {
  userId: string;
  invitationId: string;
  scopeType: MembershipScopeType;
  tenantId: string;
  storeId?: string | null;
  reason?: string | null;
}

export interface CreatedMembershipFromInvitation {
  membershipId: string;
  status: string;
}

export interface InvitationPublicView {
  id: string;
  recipientType: InvitationRecipientType;
  scopeType: MembershipScopeType;
  tenantId: string;
  storeId: string | null;
  proposedRoleKey: string | null;
  status: InvitationStatus;
  expiresAt: Date;
}
