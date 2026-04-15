import { Inject, Injectable } from '@nestjs/common';

import { ROLE_AUDIT_PORT, type RoleAuditPort } from '../../ports/role-audit.port';
import { ROLE_EVENTS_PORT, type RoleEventsPort } from '../../ports/role-events.port';
import { ROLE_REASON_MAX_LENGTH } from '../../domain/constants/role.constants';

@Injectable()
export class RoleSupportService {
  constructor(
    @Inject(ROLE_AUDIT_PORT)
    private readonly roleAuditPort: RoleAuditPort,
    @Inject(ROLE_EVENTS_PORT)
    private readonly roleEventsPort: RoleEventsPort,
  ) {}

  now(): Date {
    return new Date();
  }

  normalizeReason(value?: string | null): string | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }
    return normalized.slice(0, ROLE_REASON_MAX_LENGTH);
  }

  async recordAudit(input: {
    action: string;
    actorId: string | null;
    targetId: string | null;
    payload?: Record<string, unknown>;
    at: Date;
  }) {
    await this.roleAuditPort.record(input);
  }

  async publishEvent(input: {
    eventName: string;
    payload: Record<string, unknown>;
  }) {
    await this.roleEventsPort.publish(input);
  }
}