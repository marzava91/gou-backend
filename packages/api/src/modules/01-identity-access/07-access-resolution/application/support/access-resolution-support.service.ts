import { Inject, Injectable } from '@nestjs/common';
import { OperationalSurface } from '@prisma/client';

import { ACCESS_RESOLUTION_AUDIT_PORT } from '../../ports/access-resolution-audit.port';
import type { AccessResolutionAuditPort } from '../../ports/access-resolution-audit.port';
import { ACCESS_RESOLUTION_EVENTS_PORT } from '../../ports/access-resolution-events.port';
import type { AccessResolutionEventsPort } from '../../ports/access-resolution-events.port';
import {
  ACCESS_RESOLUTION_AUDIT_ACTIONS,
} from '../../domain/constants/access-resolution.constants';
import { AccessResolutionDomainEvents } from '../../domain/events/access-resolution.events';

@Injectable()
export class AccessResolutionSupportService {
  constructor(
    @Inject(ACCESS_RESOLUTION_AUDIT_PORT)
    private readonly auditPort: AccessResolutionAuditPort,
    @Inject(ACCESS_RESOLUTION_EVENTS_PORT)
    private readonly eventsPort: AccessResolutionEventsPort,
  ) {}

  now(): Date {
    return new Date();
  }

  async recordEvaluation(input: {
    actorId: string;
    membershipId?: string | null;
    allowed: boolean;
    reasonCode: string;
    capabilityKey?: string | null;
    resourceKey?: string | null;
    actionKey?: string | null;
    at: Date;
  }): Promise<void> {
    await this.auditPort.record({
      action: ACCESS_RESOLUTION_AUDIT_ACTIONS.ACCESS_EVALUATED,
      actorId: input.actorId,
      targetId: input.membershipId ?? null,
      payload: {
        allowed: input.allowed,
        reasonCode: input.reasonCode,
        capabilityKey: input.capabilityKey ?? null,
        resourceKey: input.resourceKey ?? null,
        actionKey: input.actionKey ?? null,
      },
      at: input.at,
    });

    await this.eventsPort.publish({
      eventName: AccessResolutionDomainEvents.ACCESS_EVALUATED,
      payload: {
        actorId: input.actorId,
        membershipId: input.membershipId ?? null,
        allowed: input.allowed,
        reasonCode: input.reasonCode,
        at: input.at,
      },
    });
  }

  async recordContextResolved(input: {
    actorId: string;
    membershipId?: string | null;
    surface: OperationalSurface;
    effectiveCapabilityCount: number;
    at: Date;
  }): Promise<void> {
    await this.auditPort.record({
      action: ACCESS_RESOLUTION_AUDIT_ACTIONS.ACCESS_CONTEXT_RESOLVED,
      actorId: input.actorId,
      targetId: input.membershipId ?? null,
      payload: {
        surface: input.surface,
        effectiveCapabilityCount: input.effectiveCapabilityCount,
      },
      at: input.at,
    });

    await this.eventsPort.publish({
      eventName: AccessResolutionDomainEvents.ACCESS_CONTEXT_RESOLVED,
      payload: {
        actorId: input.actorId,
        membershipId: input.membershipId ?? null,
        surface: input.surface,
        effectiveCapabilityCount: input.effectiveCapabilityCount,
        at: input.at,
      },
    });
  }

  async recordEffectivePermissionsComputed(input: {
    actorId: string;
    membershipId: string;
    surface: OperationalSurface;
    capabilityCount: number;
    at: Date;
  }): Promise<void> {
    await this.auditPort.record({
      action: ACCESS_RESOLUTION_AUDIT_ACTIONS.EFFECTIVE_PERMISSIONS_COMPUTED,
      actorId: input.actorId,
      targetId: input.membershipId,
      payload: {
        surface: input.surface,
        capabilityCount: input.capabilityCount,
      },
      at: input.at,
    });

    await this.eventsPort.publish({
      eventName: AccessResolutionDomainEvents.EFFECTIVE_PERMISSIONS_COMPUTED,
      payload: {
        actorId: input.actorId,
        membershipId: input.membershipId,
        surface: input.surface,
        capabilityCount: input.capabilityCount,
        at: input.at,
      },
    });
  }
}