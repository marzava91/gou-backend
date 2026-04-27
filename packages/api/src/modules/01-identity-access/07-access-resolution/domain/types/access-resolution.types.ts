// packages/api/src/modules/01-identity-and-access/07-access-resolution/domain/types/access-resolution.types.ts

import {
  AuthProvider,
  AuthSessionStatus,
  GrantEffect,
  GrantStatus,
  GrantTargetType,
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
  RoleAssignmentStatus,
  RoleScopeType,
} from '@prisma/client';

export interface AuthenticatedAccessActor {
  userId: string;
  sessionId: string;
  authIdentityId?: string | null;
  provider?: AuthProvider | null;
  isPlatformAdmin?: boolean;
}

export interface AccessEvaluationRequest {
  surface: OperationalSurface;
  capabilityKey?: string | null;
  resourceKey?: string | null;
  actionKey?: string | null;
  membershipId?: string | null;
}

export interface ResolvedAuthSession {
  sessionId: string;
  userId: string;
  status: AuthSessionStatus;
}

export interface AuthorizationMembershipAnchor {
  membershipId: string;
  userId: string;
  scopeType: MembershipScopeType;
  tenantId: string;
  storeId: string | null;
  status: MembershipStatus;
}

export interface ActiveAccessContext {
  userId: string;
  membershipId: string;
  surface: OperationalSurface;
  scopeType: MembershipScopeType;
  tenantId: string;
  storeId: string | null;
  status: MembershipStatus;
  updatedAt: Date;
}

export interface MembershipRoleCapability {
  roleAssignmentId: string;
  roleId: string;
  roleKey: string;
  roleScopeType: RoleScopeType;
  assignmentStatus: RoleAssignmentStatus;
  capabilityKey: string;
}

export interface MembershipApplicableGrant {
  id: string;
  membershipId: string;
  effect: GrantEffect;
  targetType: GrantTargetType;
  capabilityKey: string | null;
  resourceKey: string | null;
  actionKey: string | null;
  status: GrantStatus;
  validFrom: Date | null;
  validUntil: Date | null;
}

export type AccessReasonCode =
  | 'access_allowed'
  | 'auth_session_invalid'
  | 'access_context_not_resolved'
  | 'invalid_active_membership'
  | 'membership_scope_mismatch'
  | 'surface_scope_conflict'
  | 'authorization_unresolvable'
  | 'access_denied';

export interface AccessDecision {
  allowed: boolean;
  reasonCode: AccessReasonCode;
  surface: OperationalSurface;
  capabilityKey: string | null;
  resourceKey: string | null;
  actionKey: string | null;
  membership: AuthorizationMembershipAnchor | null;
  evaluatedAt: Date;
  explanation: {
    baselineMatchedCapability: boolean;
    matchedAllowGrantIds: string[];
    matchedDenyGrantIds: string[];
  };
}

export interface ResolvedAccessContext {
  session: ResolvedAuthSession;
  activeContext: ActiveAccessContext | null;
  membership: AuthorizationMembershipAnchor | null;
  effectiveCapabilityKeys: string[];
  evaluatedAt: Date;
}

export interface EffectivePermissionsResult {
  surface: OperationalSurface;
  membership: AuthorizationMembershipAnchor;
  capabilityKeys: string[];
  evaluatedAt: Date;
}