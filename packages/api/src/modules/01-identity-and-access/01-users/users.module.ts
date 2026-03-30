// packages\api\src\modules\01-identity-and-access\01-users\users.module.ts

import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UserContactChangeRequestsRepository } from './repositories/user-contact-change-requests.repository';
import { UserAccessPolicy } from './policies/user-access.policy';
import { UserSelfOrAdminGuard } from './guards/user-self-or-admin.guard';
import { UserPlatformAdminGuard } from './guards/user-platform-admin.guard';
import { UserAuthenticatedGuard } from './guards/user-authenticated.guard';
import { USER_AUDIT_PORT } from './ports/user-audit.port';
import { USER_EVENTS_PORT } from './ports/user-events.port';
import { USER_CONTACT_VERIFICATION_PORT } from './ports/user-contact-verification.port';
import { NoopUserAuditAdapter } from './adapters/audit/noop-user-audit.adapter';
import { NoopUserEventsAdapter } from './adapters/events/noop-user-events.adapter';
import { NoopUserContactVerificationAdapter } from './adapters/verification/noop-user-contact-verification.adapter';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
    UserContactChangeRequestsRepository,
    UserAccessPolicy,
    UserSelfOrAdminGuard,
    UserPlatformAdminGuard,
    UserAuthenticatedGuard,
    {
      provide: USER_AUDIT_PORT,
      useClass: NoopUserAuditAdapter,
    },
    {
      provide: USER_EVENTS_PORT,
      useClass: NoopUserEventsAdapter,
    },
    {
      provide: USER_CONTACT_VERIFICATION_PORT,
      useClass: NoopUserContactVerificationAdapter,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}