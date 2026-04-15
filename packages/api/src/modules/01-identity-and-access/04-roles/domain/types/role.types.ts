import { MembershipScopeType, RoleAssignmentStatus, RoleScopeType } from '@prisma/client';

export interface RoleActor {
  userId: string;
  isPlatformAdmin?: boolean;
}

export interface MembershipRoleAnchor {
  membershipId: string;
  userId: string;
  scopeType: MembershipScopeType;
  tenantId: string;
  storeId: string | null;
  status: string;
}

export interface RoleWithCapabilities {
  id: string;
  key: string;
  name: string;
  description: string | null;
  scopeType: RoleScopeType;
  isSystem: boolean;
  retiredAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  capabilities: Array<{
    capabilityKey: string;
  }>;
}

export interface RoleAssignmentResolved {
  id: string;
  membershipId: string;
  roleId: string;
  status: RoleAssignmentStatus;
  assignedBy: string | null;
  revokedBy: string | null;
  reason: string | null;
  assignedAt: Date;
  revokedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  role: RoleWithCapabilities;
}