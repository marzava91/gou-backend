// packages/api/src/modules/01-identity-and-access/03-memberships/application/membership-query.service.ts

import { Injectable } from '@nestjs/common';

import { MembershipsRepository } from '../memberships.repository';

import { GetMembershipByIdParamsDto } from '../dto/params/get-membership-by-id.params.dto';
import { ListMembershipsQueryDto } from '../dto/queries/list-memberships.query.dto';
import { ListCurrentUserMembershipsQueryDto } from '../dto/queries/list-current-user-memberships.query.dto';

import { MembershipNotFoundError } from '../domain/errors/membership.errors';

@Injectable()
export class MembershipQueryService {
  constructor(
    private readonly membershipsRepository: MembershipsRepository,
  ) {}

  async getMembershipById(params: GetMembershipByIdParamsDto) {
    const membership = await this.membershipsRepository.findById(params.id);

    if (!membership) {
      throw new MembershipNotFoundError();
    }

    return membership;
  }

  async listMemberships(query: ListMembershipsQueryDto) {
    return this.membershipsRepository.listMemberships({
      filters: {
        userId: query.userId,
        scopeType: query.scopeType,
        tenantId: query.tenantId,
        storeId: query.storeId,
        status: query.status,
      },
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
  }

  async listCurrentUserMemberships(
    userId: string,
    query: ListCurrentUserMembershipsQueryDto,
  ) {
    return this.membershipsRepository.listMembershipsByUserId({
      userId,
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}