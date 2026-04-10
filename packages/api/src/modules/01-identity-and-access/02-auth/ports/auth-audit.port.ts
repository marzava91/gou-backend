// packages\api\src\modules\01-identity-and-access\02-auth\ports\auth-audit.port.ts

import type { AuthAuditAction } from '../domain/constants/auth.constants';

export const AUTH_AUDIT_PORT = Symbol('AUTH_AUDIT_PORT');

export type AuthAuditRecordInput = {
  action: AuthAuditAction;
  actorUserId?: string | null;
  targetUserId?: string | null;
  metadata?: Record<string, unknown>;
};

export interface AuthAuditPort {
  record(params: AuthAuditRecordInput): Promise<void>;
}