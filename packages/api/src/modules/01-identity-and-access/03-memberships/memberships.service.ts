// packages/api/src/modules/01-identity-and-access/03-memberships/memberships.service.ts

import { Injectable } from '@nestjs/common';

import { MembershipCommandService } from './application/membership-command.service';
import { MembershipQueryService } from './application/membership-query.service';
import { MembershipContextService } from './application/membership-context.service';

import { CreateMembershipDto } from './dto/commands/create-membership.dto';
import { ActivateMembershipDto } from './dto/commands/activate-membership.dto';
import { SuspendMembershipDto } from './dto/commands/suspend-membership.dto';
import { RevokeMembershipDto } from './dto/commands/revoke-membership.dto';
import { ExpireMembershipDto } from './dto/commands/expire-membership.dto';
import { SetActiveMembershipContextDto } from './dto/commands/set-active-membership-context.dto';

import { GetMembershipByIdParamsDto } from './dto/params/get-membership-by-id.params.dto';
import { ListMembershipsQueryDto } from './dto/queries/list-memberships.query.dto';
import { ListCurrentUserMembershipsQueryDto } from './dto/queries/list-current-user-memberships.query.dto';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly membershipCommandService: MembershipCommandService,
    private readonly membershipQueryService: MembershipQueryService,
    private readonly membershipContextService: MembershipContextService,
  ) {}

  async createMembership(
    actorId: string | null | undefined,
    dto: CreateMembershipDto,
  ) {
    return this.membershipCommandService.createMembership(actorId, dto);
  }

  async getMembershipById(params: GetMembershipByIdParamsDto) {
    return this.membershipQueryService.getMembershipById(params);
  }

  async listMemberships(query: ListMembershipsQueryDto) {
    return this.membershipQueryService.listMemberships(query);
  }

  async listCurrentUserMemberships(
    userId: string,
    query: ListCurrentUserMembershipsQueryDto,
  ) {
    return this.membershipQueryService.listCurrentUserMemberships(userId, query);
  }

  async activateMembership(
    actorId: string | null | undefined,
    membershipId: string,
    dto: ActivateMembershipDto,
  ) {
    return this.membershipCommandService.activateMembership(
      actorId,
      membershipId,
      dto,
    );
  }

  async suspendMembership(
    actorId: string | null | undefined,
    membershipId: string,
    dto: SuspendMembershipDto,
  ) {
    return this.membershipCommandService.suspendMembership(
      actorId,
      membershipId,
      dto,
    );
  }

  async revokeMembership(
    actorId: string | null | undefined,
    membershipId: string,
    dto: RevokeMembershipDto,
  ) {
    return this.membershipCommandService.revokeMembership(
      actorId,
      membershipId,
      dto,
    );
  }

  async expireMembership(
    actorId: string | null | undefined,
    membershipId: string,
    dto: ExpireMembershipDto,
  ) {
    return this.membershipCommandService.expireMembership(
      actorId,
      membershipId,
      dto,
    );
  }

  async setActiveMembershipContext(
    userId: string,
    dto: SetActiveMembershipContextDto,
  ) {
    return this.membershipContextService.setActiveMembershipContext(userId, dto);
  }

  async getActiveMembershipContext(
    userId: string,
    surface: SetActiveMembershipContextDto['surface'],
  ) {
    return this.membershipContextService.getActiveMembershipContext(
      userId,
      surface,
    );
  }
}