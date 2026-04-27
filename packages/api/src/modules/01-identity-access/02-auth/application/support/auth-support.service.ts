// packages\api\src\modules\01-identity-and-access\02-auth\application\support\auth-support.service.ts

import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomInt } from 'crypto';

import { AUTH_AUDIT_PORT } from '../../ports/auth-audit.port';
import type { AuthAuditPort } from '../../ports/auth-audit.port';

import type { AuthAuditAction } from '../../domain/constants/auth.constants';

@Injectable()
export class AuthSupportService {
  constructor(
    @Inject(AUTH_AUDIT_PORT)
    private readonly authAuditPort: AuthAuditPort,
  ) {}

  async recordAudit(
    action: AuthAuditAction,
    actorUserId?: string | null,
    targetUserId?: string | null,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.authAuditPort.record({
      action,
      actorUserId: actorUserId ?? null,
      targetUserId: targetUserId ?? null,
      metadata,
    });
  }

  hashToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  maskTarget(value: string): string {
    if (value.length <= 4) return '****';
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }

  generateVerificationCode(): string {
    return randomInt(100000, 1000000).toString();
  }
}
