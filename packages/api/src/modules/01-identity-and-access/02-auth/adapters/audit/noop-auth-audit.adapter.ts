// packages\api\src\modules\01-identity-and-access\02-auth\adapters\audit\noop-auth-audit.adapter.ts

import { Injectable } from '@nestjs/common';
import { AuthAuditPort } from '../../ports/auth-audit.port';
import type { AuthAuditAction } from '../../domain/constants/auth.constants';

@Injectable()
export class NoopAuthAuditAdapter implements AuthAuditPort {
    /**
   * TODO(auth-audit-adapter):
   * Replace this noop adapter with a real audit infrastructure implementation
   * that persists auth audit records with actor, target, metadata and timestamp,
   * and integrates with the platform audit trail before production use.
   */

  async record(_params: {
    action: AuthAuditAction;
    actorUserId?: string | null;
    targetUserId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {}
}