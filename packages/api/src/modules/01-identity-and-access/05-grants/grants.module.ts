import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { GrantsController } from './grants.controller';
import { GrantsService } from './grants.service';
import { GrantsRepository } from './grants.repository';

import { GrantCommandService } from './application/grant-command.service';
import { GrantQueryService } from './application/grant-query.service';
import { GrantSupportService } from './application/support/grant-support.service';

import { GrantResponseMapper } from './mappers/grant-response.mapper';
import { GrantAccessPolicy } from './policies/grant-access.policy';
import { GrantPlatformAdminGuard } from './guards/grant-platform-admin.guard';

import { GRANT_AUDIT_PORT } from './ports/grant-audit.port';
import { GRANT_EVENTS_PORT } from './ports/grant-events.port';
import { GRANT_MEMBERSHIP_READER_PORT } from './ports/grant-membership-reader.port';

import { NoopGrantAuditAdapter } from './adapters/audit/noop-grant-audit.adapter';
import { NoopGrantEventsAdapter } from './adapters/events/noop-grant-events.adapter';
import { NoopGrantMembershipReaderAdapter } from './adapters/memberships/noop-grant-membership-reader.adapter';

@Module({
  controllers: [GrantsController],
  providers: [
    PrismaClient,
    GrantsService,
    GrantsRepository,
    GrantCommandService,
    GrantQueryService,
    GrantSupportService,
    GrantResponseMapper,
    GrantAccessPolicy,
    GrantPlatformAdminGuard,
    {
      provide: GRANT_AUDIT_PORT,
      useClass: NoopGrantAuditAdapter,
    },
    {
      provide: GRANT_EVENTS_PORT,
      useClass: NoopGrantEventsAdapter,
    },
    {
      provide: GRANT_MEMBERSHIP_READER_PORT,
      useClass: NoopGrantMembershipReaderAdapter,
    },
  ],
  exports: [GrantsService],
})
export class GrantsModule {}
