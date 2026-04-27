// packages/api/src/modules/01-identity-access/03-memberships/memberships.repository.ts

import { Injectable } from '@nestjs/common';
import {
  Prisma,
  MembershipStatus,
  MembershipScopeType,
  OperationalSurface,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

import {
  MEMBERSHIP_DEFAULT_PAGE_SIZE,
  MEMBERSHIP_MAX_PAGE_SIZE,
  type MembershipListSortDirection,
  type MembershipListSortField,
} from './domain/constants/membership.constants';
import { buildEquivalentMembershipWhere } from './domain/rules/membership-equivalence.rule';

@Injectable()
export class MembershipsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.membership.findUnique({
      where: { id },
    });
  }

  async findByIdOrThrow(id: string) {
    return this.prisma.membership.findUniqueOrThrow({
      where: { id },
    });
  }

  async findEquivalentOpenMembership(input: {
    userId: string;
    scopeType: MembershipScopeType;
    tenantId: string;
    storeId?: string | null;
  }) {
    return this.prisma.membership.findFirst({
      where: buildEquivalentMembershipWhere(input),
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMembership(data: Prisma.MembershipUncheckedCreateInput) {
    try {
      return await this.prisma.membership.create({
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new Error('duplicate_membership');
      }

      throw error;
    }
  }

  async updateMembershipStatus(input: {
    id: string;
    fromStatus: MembershipStatus;
    toStatus: MembershipStatus;
    reason?: string | null;
    timestampField?:
      | 'activatedAt'
      | 'suspendedAt'
      | 'revokedAt'
      | 'expiredAt'
      | null;
    at: Date;
  }) {
    const { id, fromStatus, toStatus, reason, timestampField, at } = input;

    const data: Prisma.MembershipUncheckedUpdateInput = {
      status: toStatus,
      reason: reason ?? null,
      updatedAt: at,
      version: {
        increment: 1,
      },
    };

    if (timestampField) {
      data[timestampField] = at;
    }

    const result = await this.prisma.membership.updateMany({
      where: {
        id,
        status: fromStatus,
      },
      data,
    });

    return result.count;
  }

  async createStatusHistory(
    data: Prisma.MembershipStatusHistoryUncheckedCreateInput,
  ) {
    return this.prisma.membershipStatusHistory.create({
      data,
    });
  }

  async listMemberships(input: {
    filters?: {
      userId?: string;
      scopeType?: MembershipScopeType;
      tenantId?: string;
      storeId?: string;
      status?: MembershipStatus;
    };
    page?: number;
    pageSize?: number;
    sortBy?: MembershipListSortField;
    sortDirection?: MembershipListSortDirection;
  }) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(
      MEMBERSHIP_MAX_PAGE_SIZE,
      Math.max(1, input.pageSize ?? MEMBERSHIP_DEFAULT_PAGE_SIZE),
    );
    const skip = (page - 1) * pageSize;

    const where: Prisma.MembershipWhereInput = {
      userId: input.filters?.userId,
      scopeType: input.filters?.scopeType,
      tenantId: input.filters?.tenantId,
      storeId: input.filters?.storeId,
      status: input.filters?.status,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.membership.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [input.sortBy ?? 'createdAt']: input.sortDirection ?? 'desc',
        },
      }),
      this.prisma.membership.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async listMembershipsByUserId(input: {
    userId: string;
    status?: MembershipStatus;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(
      MEMBERSHIP_MAX_PAGE_SIZE,
      Math.max(1, input.pageSize ?? MEMBERSHIP_DEFAULT_PAGE_SIZE),
    );
    const skip = (page - 1) * pageSize;

    const where: Prisma.MembershipWhereInput = {
      userId: input.userId,
      status: input.status,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.membership.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.membership.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async upsertActiveContext(input: {
    userId: string;
    surface: OperationalSurface;
    membershipId: string;
  }) {
    return this.prisma.activeMembershipContext.upsert({
      where: {
        userId_surface: {
          userId: input.userId,
          surface: input.surface,
        },
      },
      update: {
        membershipId: input.membershipId,
      },
      create: {
        userId: input.userId,
        surface: input.surface,
        membershipId: input.membershipId,
      },
    });
  }

  async findActiveContext(input: {
    userId: string;
    surface: OperationalSurface;
  }) {
    return this.prisma.activeMembershipContext.findUnique({
      where: {
        userId_surface: {
          userId: input.userId,
          surface: input.surface,
        },
      },
      include: {
        membership: true,
      },
    });
  }

  async clearActiveContext(input: {
    userId: string;
    surface: OperationalSurface;
  }) {
    return this.prisma.activeMembershipContext.deleteMany({
      where: {
        userId: input.userId,
        surface: input.surface,
      },
    });
  }

  async clearActiveContextsForMembership(membershipId: string) {
    return this.prisma.activeMembershipContext.deleteMany({
      where: {
        membershipId,
      },
    });
  }

  async findMembershipOwnedByUser(input: {
    membershipId: string;
    userId: string;
  }) {
    return this.prisma.membership.findFirst({
      where: {
        id: input.membershipId,
        userId: input.userId,
      },
    });
  }
}
