// packages/api/src/modules/01-identity-and-access/03-memberships/ports/membership-audit.port.ts

import type { MembershipAuditAction } from '../domain/constants/membership.constants';

export const MEMBERSHIP_AUDIT_PORT = Symbol('MEMBERSHIP_AUDIT_PORT');

export interface MembershipAuditPort {
  record(input: {
    action: MembershipAuditAction;
    actorId?: string | null;
    membershipId?: string | null;
    payload?: Record<string, unknown>;
    at?: Date;
  }): Promise<void>;
}
