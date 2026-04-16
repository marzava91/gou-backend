import {
  GrantEffect,
  GrantStatus,
  GrantTargetType,
  MembershipScopeType,
  MembershipStatus,
} from '@prisma/client';

export interface GrantActor {
  userId: string;
  isPlatformAdmin?: boolean;
}

export interface GrantMembershipContext {
  membershipId: string;
  userId: string;
  scopeType: MembershipScopeType;
  tenantId: string;
  storeId: string | null;
  status: MembershipStatus;
}

export interface CapabilityGrantTarget {
  targetType: typeof GrantTargetType.CAPABILITY;
  capabilityKey: string;
  resourceKey?: null;
  actionKey?: null;
}

export interface ResourceActionGrantTarget {
  targetType: typeof GrantTargetType.RESOURCE_ACTION;
  capabilityKey?: null;
  resourceKey: string;
  actionKey: string;
}

export type GrantTarget = CapabilityGrantTarget | ResourceActionGrantTarget;

export interface GrantAuditRecord {
  action: string;
  actorId: string | null;
  targetId: string;
  payload?: Record<string, unknown>;
  at: Date;
}

export interface GrantEventEnvelope {
  eventName: string;
  payload: Record<string, unknown>;
}

export interface GrantListFilters {
  membershipId?: string;
  effect?: GrantEffect;
  targetType?: GrantTargetType;
  status?: GrantStatus;
}