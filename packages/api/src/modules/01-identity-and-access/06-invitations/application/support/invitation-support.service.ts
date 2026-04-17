import { Inject, Injectable } from '@nestjs/common';
import { InvitationStatus } from '@prisma/client';
import {
  INVITATION_AUDIT_PORT,
  type InvitationAuditPort,
} from '../../ports/invitation-audit.port';
import {
  INVITATION_EVENTS_PORT,
  type InvitationEventsPort,
} from '../../ports/invitation-events.port';
import { INVITATION_AUDIT_ACTIONS } from '../../domain/constants/invitation.constants';
import { InvitationDomainEvents } from '../../domain/events/invitation.events';
import {
  InvitationAlreadyAcceptedError,
  InvitationExpiredError,
  InvitationRevokedError,
} from '../../domain/errors/invitation.errors';

@Injectable()
export class InvitationSupportService {
  constructor(
    @Inject(INVITATION_AUDIT_PORT)
    private readonly auditPort: InvitationAuditPort,
    @Inject(INVITATION_EVENTS_PORT)
    private readonly eventsPort: InvitationEventsPort,
  ) {}

  assertInvitationAcceptable(invitation: {
    status: InvitationStatus;
    expiresAt: Date;
    revokedAt?: Date | null;
    acceptedAt?: Date | null;
  }): void {
    if (
      invitation.status === InvitationStatus.ACCEPTED ||
      invitation.acceptedAt
    ) {
      throw new InvitationAlreadyAcceptedError();
    }

    if (
      invitation.status === InvitationStatus.REVOKED ||
      invitation.revokedAt
    ) {
      throw new InvitationRevokedError();
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      throw new InvitationExpiredError();
    }
  }

  async recordAudit(
    action: string,
    actorUserId: string | null,
    targetId: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.auditPort.record(action, actorUserId, targetId, metadata);
  }

  async publishEvent(eventName: string, payload: Record<string, unknown>) {
    await this.eventsPort.publish({ eventName, payload });
  }

  async recordAccepted(
    invitationId: string,
    actorUserId: string | null,
    metadata?: Record<string, unknown>,
  ) {
    await this.recordAudit(
      INVITATION_AUDIT_ACTIONS.INVITATION_ACCEPTED,
      actorUserId,
      invitationId,
      metadata,
    );
    await this.publishEvent(InvitationDomainEvents.INVITATION_ACCEPTED, {
      invitationId,
      ...metadata,
    });
  }
}
