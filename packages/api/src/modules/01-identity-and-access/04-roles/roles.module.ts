import { Module } from '@nestjs/common';

import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { RolesRepository } from './roles.repository';
import { RoleCommandService } from './application/role-command.service';
import { RoleQueryService } from './application/role-query.service';
import { RoleSupportService } from './application/support/role-support.service';
import { RoleResponseMapper } from './mappers/role-response.mapper';
import { RoleAccessPolicy } from './policies/role-access.policy';
import { RolePlatformAdminGuard } from './guards/role-platform-admin.guard';

import { ROLE_AUDIT_PORT } from './ports/role-audit.port';
import { ROLE_EVENTS_PORT } from './ports/role-events.port';
import { ROLE_MEMBERSHIP_READER_PORT } from './ports/role-membership-reader.port';

import { NoopRoleAuditAdapter } from './adapters/audit/noop-role-audit.adapter';
import { NoopRoleEventsAdapter } from './adapters/events/noop-role-events.adapter';
import { NoopRoleMembershipReaderAdapter } from './adapters/memberships/noop-role-membership-reader.adapter';

@Module({
  controllers: [RolesController],
  providers: [
    RolesService,
    RolesRepository,
    RoleCommandService,
    RoleQueryService,
    RoleSupportService,
    RoleResponseMapper,
    RoleAccessPolicy,
    RolePlatformAdminGuard,
    NoopRoleAuditAdapter,
    NoopRoleEventsAdapter,
    NoopRoleMembershipReaderAdapter,
    {
      provide: ROLE_AUDIT_PORT,
      useExisting: NoopRoleAuditAdapter,
    },
    {
      provide: ROLE_EVENTS_PORT,
      useExisting: NoopRoleEventsAdapter,
    },
    {
      provide: ROLE_MEMBERSHIP_READER_PORT,
      useExisting: NoopRoleMembershipReaderAdapter,
    },
  ],
  exports: [RolesService],
})
export class RolesModule {}