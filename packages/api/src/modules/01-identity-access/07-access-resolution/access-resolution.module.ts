// packages/api/src/modules/01-identity-and-access/07-access-resolution/access-resolution.module.ts

import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../prisma/prisma.module';

import { PrismaAccessAuthReaderAdapter } from './adapters/prisma/prisma-access-auth-reader.adapter';
import { PrismaAccessMembershipReaderAdapter } from './adapters/prisma/prisma-access-membership-reader.adapter';
import { PrismaAccessRoleReaderAdapter } from './adapters/prisma/prisma-access-role-reader.adapter';
import { PrismaAccessGrantReaderAdapter } from './adapters/prisma/prisma-access-grant-reader.adapter';

import { AccessResolutionController } from './access-resolution.controller';
import { AccessResolutionFacadeService } from './access-resolution.service';
import { AccessResolutionService } from './application/access-resolution.service';
import { AccessResolutionSupportService } from './application/support/access-resolution-support.service';

import { AccessDecisionMapper } from './mappers/access-decision.mapper';
import { AccessContextMapper } from './mappers/access-context.mapper';
import { EffectivePermissionMapper } from './mappers/effective-permission.mapper';

import { AccessResolutionAuthenticatedGuard } from './guards/access-resolution-authenticated.guard';

import {
  ACCESS_RESOLUTION_AUDIT_PORT,
} from './ports/access-resolution-audit.port';
import {
  ACCESS_RESOLUTION_EVENTS_PORT,
} from './ports/access-resolution-events.port';
import { ACCESS_AUTH_READER_PORT } from './ports/access-auth-reader.port';
import { ACCESS_MEMBERSHIP_READER_PORT } from './ports/access-membership-reader.port';
import { ACCESS_ROLE_READER_PORT } from './ports/access-role-reader.port';
import { ACCESS_GRANT_READER_PORT } from './ports/access-grant-reader.port';

import { NoopAccessResolutionAuditAdapter } from './adapters/audit/noop-access-resolution-audit.adapter';
import { NoopAccessResolutionEventsAdapter } from './adapters/events/noop-access-resolution-events.adapter';

@Module({
  imports: [PrismaModule],
  controllers: [AccessResolutionController],
  providers: [
    AccessResolutionFacadeService,
    AccessResolutionService,
    AccessResolutionSupportService,

    AccessDecisionMapper,
    AccessContextMapper,
    EffectivePermissionMapper,

    AccessResolutionAuthenticatedGuard,

    {
      provide: ACCESS_RESOLUTION_AUDIT_PORT,
      useClass: NoopAccessResolutionAuditAdapter,
    },
    {
      provide: ACCESS_RESOLUTION_EVENTS_PORT,
      useClass: NoopAccessResolutionEventsAdapter,
    },
    {
      provide: ACCESS_AUTH_READER_PORT,
      useClass: PrismaAccessAuthReaderAdapter,
    },
    {
      provide: ACCESS_MEMBERSHIP_READER_PORT,
      useClass: PrismaAccessMembershipReaderAdapter,
    },
    {
      provide: ACCESS_ROLE_READER_PORT,
      useClass: PrismaAccessRoleReaderAdapter,
    },
    {
      provide: ACCESS_GRANT_READER_PORT,
      useClass: PrismaAccessGrantReaderAdapter,
    },
  ],
  exports: [AccessResolutionFacadeService, AccessResolutionService],
})
export class AccessResolutionModule {}