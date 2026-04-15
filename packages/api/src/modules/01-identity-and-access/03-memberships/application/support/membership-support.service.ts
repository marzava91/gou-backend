// packages/api/src/modules/01-identity-and-access/03-memberships/application/support/membership-support.service.ts

import { Inject, Injectable } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';

import {
  MEMBERSHIP_AUDIT_PORT,
  type MembershipAuditPort,
} from '../../ports/membership-audit.port';
import {
  MEMBERSHIP_EVENTS_PORT,
  type MembershipEventsPort,
} from '../../ports/membership-events.port';

import {
  MEMBERSHIP_AUDIT_ACTIONS,
  MEMBERSHIP_REASON_MAX_LENGTH,
  type MembershipAuditAction,
} from '../../domain/constants/membership.constants';
import {
  MembershipDomainEvents,
  type MembershipDomainEvent,
} from '../../domain/events/membership.events';

@Injectable()
export class MembershipSupportService {
  constructor(
    @Inject(MEMBERSHIP_AUDIT_PORT)
    private readonly membershipAuditPort: MembershipAuditPort,
    @Inject(MEMBERSHIP_EVENTS_PORT)
    private readonly membershipEventsPort: MembershipEventsPort,
  ) {}

  now(): Date {
    return new Date();
  }

  normalizeReason(reason?: string | null): string | null {
    if (!reason) {
      return null;
    }

    const normalized = reason.trim();

    if (!normalized) {
      return null;
    }

    return normalized.slice(0, MEMBERSHIP_REASON_MAX_LENGTH);
  }

  resolveStatusTimestampField(
    toStatus: MembershipStatus,
  ): 'activatedAt' | 'suspendedAt' | 'revokedAt' | 'expiredAt' | null {
    switch (toStatus) {
      case MembershipStatus.ACTIVE:
        return 'activatedAt';
      case MembershipStatus.SUSPENDED:
        return 'suspendedAt';
      case MembershipStatus.REVOKED:
        return 'revokedAt';
      case MembershipStatus.EXPIRED:
        return 'expiredAt';
      default:
        return null;
    }
  }

  async recordAudit(input: {
    action: MembershipAuditAction;
    actorId?: string | null;
    membershipId?: string | null;
    payload?: Record<string, unknown>;
    at?: Date;
  }): Promise<void> {
    await this.membershipAuditPort.record({
      action: input.action,
      actorId: input.actorId,
      membershipId: input.membershipId,
      payload: input.payload,
      at: input.at ?? this.now(),
    });
  }

  async publishEvent(input: {
    event: MembershipDomainEvent;
    payload: Record<string, unknown>;
    at?: Date;
  }): Promise<void> {
    await this.membershipEventsPort.publish({
      event: input.event,
      payload: input.payload,
      at: input.at ?? this.now(),
    });
  }

  async recordLifecycleChange(input: {
    toStatus: MembershipStatus;
    actorId?: string | null;
    membershipId: string;
    payload?: Record<string, unknown>;
    at?: Date;
  }): Promise<void> {
    const at = input.at ?? this.now();

    const action = this.resolveAuditActionForStatus(input.toStatus);
    const event = this.resolveEventForStatus(input.toStatus);

    if (action) {
      await this.recordAudit({
        action,
        actorId: input.actorId,
        membershipId: input.membershipId,
        payload: input.payload,
        at,
      });
    }

    if (event) {
      await this.publishEvent({
        event,
        payload: {
          membershipId: input.membershipId,
          ...input.payload,
        },
        at,
      });
    }
  }

  private resolveAuditActionForStatus(
    status: MembershipStatus,
  ): MembershipAuditAction | null {
    switch (status) {
      case MembershipStatus.ACTIVE:
        return MEMBERSHIP_AUDIT_ACTIONS.MEMBERSHIP_ACTIVATED;
      case MembershipStatus.SUSPENDED:
        return MEMBERSHIP_AUDIT_ACTIONS.MEMBERSHIP_SUSPENDED;
      case MembershipStatus.REVOKED:
        return MEMBERSHIP_AUDIT_ACTIONS.MEMBERSHIP_REVOKED;
      case MembershipStatus.EXPIRED:
        return MEMBERSHIP_AUDIT_ACTIONS.MEMBERSHIP_EXPIRED;
      default:
        return null;
    }
  }

  private resolveEventForStatus(
    status: MembershipStatus,
  ): MembershipDomainEvent | null {
    switch (status) {
      case MembershipStatus.ACTIVE:
        return MembershipDomainEvents.MEMBERSHIP_ACTIVATED;
      case MembershipStatus.SUSPENDED:
        return MembershipDomainEvents.MEMBERSHIP_SUSPENDED;
      case MembershipStatus.REVOKED:
        return MembershipDomainEvents.MEMBERSHIP_REVOKED;
      case MembershipStatus.EXPIRED:
        return MembershipDomainEvents.MEMBERSHIP_EXPIRED;
      default:
        return null;
    }
  }
}