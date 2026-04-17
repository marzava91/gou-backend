import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { InvitationsRepository } from '../invitations.repository';
import { InvitationResponseMapper } from '../mappers/invitation-response.mapper';
import { InvitationTokenService } from './invitation-token.service';

import { InvitationNotFoundError } from '../domain/errors/invitation.errors';
import {
  INVITATION_OPERATIONAL_LIMITS,
  type InvitationListSortField,
  type InvitationSortDirection,
} from '../domain/constants/invitation.constants';

import { GetInvitationByTokenQueryDto } from '../dto/queries/get-invitation-by-token.query.dto';
import { ListInvitationsQueryDto } from '../dto/queries/list-invitations.query.dto';

@Injectable()
export class InvitationQueryService {
  constructor(
    private readonly repository: InvitationsRepository,
    private readonly mapper: InvitationResponseMapper,
    private readonly tokenService: InvitationTokenService,
  ) {}

  async getInvitationById(invitationId: string) {
    const invitation = await this.repository.findById(invitationId);

    if (!invitation) {
      throw new InvitationNotFoundError();
    }

    return this.mapper.toResponse(invitation);
  }

  async getInvitationByToken(dto: GetInvitationByTokenQueryDto) {
    const tokenHash = this.tokenService.hash(dto.token);
    const invitation = await this.repository.findByTokenHash(tokenHash);

    if (!invitation) {
      throw new InvitationNotFoundError();
    }

    return this.mapper.toPublicResponse(invitation);
  }

  async listInvitations(query: ListInvitationsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(
      query.pageSize ?? INVITATION_OPERATIONAL_LIMITS.DEFAULT_PAGE_SIZE,
      INVITATION_OPERATIONAL_LIMITS.MAX_PAGE_SIZE,
    );

    const skip = (page - 1) * pageSize;

    const where: Prisma.InvitationWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.recipientType ? { recipientType: query.recipientType } : {}),
      ...(query.scopeType ? { scopeType: query.scopeType } : {}),
      ...(query.tenantId ? { tenantId: query.tenantId } : {}),
      ...(query.storeId ? { storeId: query.storeId } : {}),
    };

    const orderBy = this.buildOrderBy(query.sortBy, query.sortDirection);

    const result = await this.repository.listInvitations({
      where,
      skip,
      take: pageSize,
      orderBy,
    });

    return {
      items: result.items.map((invitation) =>
        this.mapper.toResponse(invitation),
      ),
      page,
      pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize),
    };
  }

  private buildOrderBy(
    sortBy?: InvitationListSortField,
    sortDirection?: InvitationSortDirection,
  ): Prisma.InvitationOrderByWithRelationInput {
    const resolvedDirection: Prisma.SortOrder = sortDirection ?? 'desc';

    switch (sortBy) {
      case 'expiresAt':
        return { expiresAt: resolvedDirection };
      case 'status':
        return { status: resolvedDirection };
      case 'createdAt':
      default:
        return { createdAt: resolvedDirection };
    }
  }
}
