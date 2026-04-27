import type { AccessResolutionAuditAction } from '../domain/constants/access-resolution.constants';

export const ACCESS_RESOLUTION_AUDIT_PORT = Symbol('ACCESS_RESOLUTION_AUDIT_PORT');

export interface AccessResolutionAuditPort {
  record(input: {
    action: AccessResolutionAuditAction;
    actorId?: string | null;
    targetId?: string | null;
    payload?: Record<string, unknown>;
    at?: Date;
  }): Promise<void>;
}