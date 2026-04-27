// src/modules/01-identity-access/identity-access.module.ts

import { Module } from '@nestjs/common';

import { AuthModule } from './02-auth/auth.module';
import { UsersModule } from './01-users/users.module';
import { MembershipsModule } from './03-memberships/memberships.module';
import { RolesModule } from './04-roles/roles.module';
import { GrantsModule } from './05-grants/grants.module';
import { InvitationsModule } from './06-invitations/invitations.module';
import { AccessResolutionModule } from './07-access-resolution/access-resolution.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    MembershipsModule,
    RolesModule,
    GrantsModule,
    InvitationsModule,
    AccessResolutionModule,
  ],
  exports: [
    UsersModule,
    AuthModule,
    MembershipsModule,
    RolesModule,
    GrantsModule,
    InvitationsModule,
    AccessResolutionModule,
  ],
})
export class IdentityAccessModule {}