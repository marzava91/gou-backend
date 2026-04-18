import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { InvitationsController } from './invitations.controller';
import { InvitationsRepository } from './invitations.repository';
import { InvitationsService } from './invitations.service';

import { InvitationCommandService } from './application/invitation-command.service';
import { InvitationQueryService } from './application/invitation-query.service';
import { InvitationTokenService } from './application/invitation-token.service';
import { InvitationSupportService } from './application/support/invitation-support.service';

import { InvitationResponseMapper } from './mappers/invitation-response.mapper';
import { InvitationAccessPolicy } from './policies/invitation-access.policy';

// Guards nuevos
import { CreateInvitationGuard } from './guards/create-invitation.guard';
import { ResendInvitationGuard } from './guards/resend-invitation.guard';
import { RevokeInvitationGuard } from './guards/revoke-invitation.guard';
import { CancelInvitationGuard } from './guards/cancel-invitation.guard';
import { ReadInvitationGuard } from './guards/read-invitation.guard';

// Déjalo solo si todavía lo usas realmente en algún lado
import { InvitationAuthenticatedGuard } from './guards/invitation-authenticated.guard';

import { INVITATION_AUDIT_PORT } from './ports/invitation-audit.port';
import { INVITATION_EVENTS_PORT } from './ports/invitation-events.port';
import { INVITATION_NOTIFICATION_PORT } from './ports/invitation-notification.port';
import { INVITATION_MEMBERSHIP_WRITER_PORT } from './ports/invitation-membership-writer.port';
import { INVITATION_USER_RESOLUTION_PORT } from './ports/invitation-user-resolution.port';

import { NoopInvitationAuditAdapter } from './adapters/audit/noop-invitation-audit.adapter';
import { NoopInvitationEventsAdapter } from './adapters/events/noop-invitation-events.adapter';
import { NoopInvitationNotificationAdapter } from './adapters/notifications/noop-invitation-notification.adapter';
import { NoopInvitationMembershipWriterAdapter } from './adapters/memberships/noop-invitation-membership-writer.adapter';
import { NoopInvitationUserResolutionAdapter } from './adapters/users/noop-invitation-user-resolution.adapter';

@Module({
  controllers: [InvitationsController],
  providers: [
    PrismaClient,
    InvitationsRepository,

    InvitationsService,
    InvitationCommandService,
    InvitationQueryService,
    InvitationTokenService,
    InvitationSupportService,

    InvitationResponseMapper,
    InvitationAccessPolicy,

    // Guards reales del controller
    CreateInvitationGuard,
    ResendInvitationGuard,
    RevokeInvitationGuard,
    CancelInvitationGuard,
    ReadInvitationGuard,

    // Solo si aún lo usa algo interno
    InvitationAuthenticatedGuard,

    NoopInvitationAuditAdapter,
    NoopInvitationEventsAdapter,
    NoopInvitationNotificationAdapter,
    NoopInvitationMembershipWriterAdapter,
    NoopInvitationUserResolutionAdapter,

    {
      provide: INVITATION_AUDIT_PORT,
      useExisting: NoopInvitationAuditAdapter,
    },
    {
      provide: INVITATION_EVENTS_PORT,
      useExisting: NoopInvitationEventsAdapter,
    },
    {
      provide: INVITATION_NOTIFICATION_PORT,
      useExisting: NoopInvitationNotificationAdapter,
    },
    {
      provide: INVITATION_MEMBERSHIP_WRITER_PORT,
      useExisting: NoopInvitationMembershipWriterAdapter,
    },
    {
      provide: INVITATION_USER_RESOLUTION_PORT,
      useExisting: NoopInvitationUserResolutionAdapter,
    },
  ],
  exports: [
    InvitationsService,
    InvitationCommandService,
    InvitationQueryService,
    InvitationsRepository,
  ],
})
export class InvitationsModule {}