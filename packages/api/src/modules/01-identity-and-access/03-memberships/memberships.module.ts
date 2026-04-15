// packages/api/src/modules/01-identity-and-access/03-memberships/memberships.module.ts

import { Module } from '@nestjs/common';

import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { MembershipsRepository } from './memberships.repository';

import { MembershipCommandService } from './application/membership-command.service';
import { MembershipQueryService } from './application/membership-query.service';
import { MembershipContextService } from './application/membership-context.service';
import { MembershipSupportService } from './application/support/membership-support.service';

import { MembershipResponseMapper } from './mappers/membership-response.mapper';
import { MembershipAccessPolicy } from './policies/membership-access.policy';

import { MembershipPlatformAdminGuard } from './guards/membership-platform-admin.guard';
import { MembershipSelfOrPlatformAdminGuard  } from './guards/membership-self-or-platform-admin.guard';

import { MEMBERSHIP_AUDIT_PORT } from './ports/membership-audit.port';
import { MEMBERSHIP_EVENTS_PORT } from './ports/membership-events.port';
import { MEMBERSHIP_SCOPE_DIRECTORY_PORT } from './ports/membership-scope-directory.port';
import { MEMBERSHIP_INVITATION_READER_PORT } from './ports/membership-invitation-reader.port';

import { NoopMembershipAuditAdapter } from './adapters/audit/noop-membership-audit.adapter';
import { NoopMembershipEventsAdapter } from './adapters/events/noop-membership-events.adapter';
import { NoopMembershipScopeDirectoryAdapter } from './adapters/scope/noop-membership-scope-directory.adapter';
import { NoopMembershipInvitationReaderAdapter } from './adapters/invitations/noop-membership-invitation-reader.adapter';

@Module({
  controllers: [MembershipsController],
  providers: [
    MembershipsService,
    MembershipsRepository,

    MembershipCommandService,
    MembershipQueryService,
    MembershipContextService,
    MembershipSupportService,

    MembershipResponseMapper,
    MembershipAccessPolicy,

    MembershipPlatformAdminGuard,
    MembershipSelfOrPlatformAdminGuard,

    {
      provide: MEMBERSHIP_AUDIT_PORT,
      useClass: NoopMembershipAuditAdapter,
    },
    {
      provide: MEMBERSHIP_EVENTS_PORT,
      useClass: NoopMembershipEventsAdapter,
    },
    {
      provide: MEMBERSHIP_SCOPE_DIRECTORY_PORT,
      useClass: NoopMembershipScopeDirectoryAdapter,
    },
    {
      provide: MEMBERSHIP_INVITATION_READER_PORT,
      useClass: NoopMembershipInvitationReaderAdapter,
    },
  ],
  exports: [
    MembershipsService,
    MembershipsRepository,
    MembershipCommandService,
    MembershipQueryService,
    MembershipContextService,
    MembershipAccessPolicy,
  ],
})
export class MembershipsModule {}