import { Injectable } from '@nestjs/common';

import { GrantCommandService } from './application/grant-command.service';
import { GrantQueryService } from './application/grant-query.service';

import { CreateGrantDto } from './dto/commands/create-grant.dto';
import { RevokeGrantDto } from './dto/commands/revoke-grant.dto';
import { ListGrantsQueryDto } from './dto/queries/list-grants.query.dto';

@Injectable()
export class GrantsService {
  constructor(
    private readonly grantCommandService: GrantCommandService,
    private readonly grantQueryService: GrantQueryService,
  ) {}

  createGrant(actorId: string | null, dto: CreateGrantDto) {
    return this.grantCommandService.createGrant(actorId, dto);
  }

  revokeGrant(actorId: string | null, grantId: string, dto: RevokeGrantDto) {
    return this.grantCommandService.revokeGrant(actorId, grantId, dto);
  }

  listGrants(query: ListGrantsQueryDto) {
    return this.grantQueryService.listGrants(query);
  }

  getGrantById(grantId: string) {
    return this.grantQueryService.getGrantById(grantId);
  }

  listMembershipGrants(membershipId: string) {
    return this.grantQueryService.listMembershipGrants(membershipId);
  }
}