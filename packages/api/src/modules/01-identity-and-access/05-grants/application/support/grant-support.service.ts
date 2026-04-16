import { Inject, Injectable } from '@nestjs/common';
import { GrantStatus } from '@prisma/client';

import { GRANT_AUDIT_PORT, } from '../../ports/grant-audit.port';
import type { GrantAuditPort, } from '../../ports/grant-audit.port';

import { GRANT_EVENTS_PORT } from '../../ports/grant-events.port';
import type { GrantEventsPort } from '../../ports/grant-events.port';

import {
  GRANT_REASON_MAX_LENGTH,
  GrantAuditAction,
} from '../../domain/constants/grant.constants';

@Injectable()
export class GrantSupportService {
  constructor(
    @Inject(GRANT_AUDIT_PORT)
    private readonly grantAuditPort: GrantAuditPort,
    @Inject(GRANT_EVENTS_PORT)
    private readonly grantEventsPort: GrantEventsPort,
  ) {}

  now(): Date {
    return new Date();
  }

  normalizeReason(value?: string | null): string | null {
    const normalized = value?.trim() ?? null;
    if (!normalized) return null;
    return normalized.slice(0, GRANT_REASON_MAX_LENGTH);
  }

  async recordAudit(input: {
    action: GrantAuditAction;
    actorId: string | null;
    targetId: string;
    payload?: Record<string, unknown>;
    at: Date;
  }): Promise<void> {
    await this.grantAuditPort.record(input);
  }

  async publishEvent(input: {
    eventName: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    await this.grantEventsPort.publish(input);
  }

  resolveStatusTimestampField(status: GrantStatus): 'activatedAt' | 'expiredAt' | 'revokedAt' | null {
    switch (status) {
      case GrantStatus.ACTIVE:
        return 'activatedAt';
      case GrantStatus.EXPIRED:
        return 'expiredAt';
      case GrantStatus.REVOKED:
        return 'revokedAt';
      default:
        return null;
    }
  }
}