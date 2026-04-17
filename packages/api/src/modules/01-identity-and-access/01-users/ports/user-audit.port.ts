// packages\api\src\modules\01-identity-and-access\01-users\ports\user-audit.port.ts

import type { UserAuditAction } from '../domain/constants/users.constants';

export const USER_AUDIT_PORT = Symbol('USER_AUDIT_PORT');

export interface UserAuditPort {
  record(event: {
    action: UserAuditAction;
    actorUserId?: string | null;
    targetUserId: string;
    metadata?: Record<string, unknown>;
    occurredAt?: Date;
  }): Promise<void>;
}
