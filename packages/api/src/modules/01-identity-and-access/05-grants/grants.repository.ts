import { Injectable } from '@nestjs/common';
import {
  GrantEffect,
  GrantStatus,
  GrantTargetType,
  PrismaClient,
} from '@prisma/client';

@Injectable()
export class GrantsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createGrantWithHistory(input: {
    membershipId: string;
    effect: GrantEffect;
    targetType: GrantTargetType;
    capabilityKey?: string | null;
    resourceKey?: string | null;
    actionKey?: string | null;
    status: GrantStatus;
    validFrom?: Date | null;
    validUntil?: Date | null;
    creationReason?: string | null;
    createdBy?: string | null;
    activatedAt?: Date | null;
    version: number;
    history: {
      fromStatus: GrantStatus | null;
      toStatus: GrantStatus;
      changedBy: string | null;
      reason: string | null;
      createdAt: Date;
    };
  }) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.grant.create({
        data: {
          membershipId: input.membershipId,
          effect: input.effect,
          targetType: input.targetType,
          capabilityKey: input.capabilityKey ?? null,
          resourceKey: input.resourceKey ?? null,
          actionKey: input.actionKey ?? null,
          status: input.status,
          validFrom: input.validFrom ?? null,
          validUntil: input.validUntil ?? null,
          creationReason: input.creationReason ?? null,
          createdBy: input.createdBy ?? null,
          activatedAt: input.activatedAt ?? null,
          version: input.version,
        },
      });

      await tx.grantHistory.create({
        data: {
          grantId: created.id,
          fromStatus: input.history.fromStatus,
          toStatus: input.history.toStatus,
          changedBy: input.history.changedBy,
          reason: input.history.reason,
          createdAt: input.history.createdAt,
        },
      });

      return created;
    });
  }

  async revokeGrantWithHistory(input: {
    id: string;
    expectedVersion: number;
    currentStatus: GrantStatus;
    revokedBy: string | null;
    revocationReason: string | null;
    revokedAt: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.grant.updateMany({
        where: {
          id: input.id,
          version: input.expectedVersion,
          status: input.currentStatus,
        },
        data: {
          status: GrantStatus.REVOKED,
          revokedBy: input.revokedBy,
          revocationReason: input.revocationReason,
          revokedAt: input.revokedAt,
          version: { increment: 1 },
        },
      });

      if (updateResult.count !== 1) {
        return { count: 0 as const };
      }

      await tx.grantHistory.create({
        data: {
          grantId: input.id,
          fromStatus: input.currentStatus,
          toStatus: GrantStatus.REVOKED,
          changedBy: input.revokedBy,
          reason: input.revocationReason,
          createdAt: input.revokedAt,
        },
      });

      return { count: 1 as const };
    });
  }

  async findById(id: string) {
    return this.prisma.grant.findUnique({ where: { id } });
  }

  async findDuplicateActiveGrant(input: {
    membershipId: string;
    effect: GrantEffect;
    targetType: GrantTargetType;
    capabilityKey?: string | null;
    resourceKey?: string | null;
    actionKey?: string | null;
  }) {
    return this.prisma.grant.findFirst({
      where: {
        membershipId: input.membershipId,
        effect: input.effect,
        targetType: input.targetType,
        capabilityKey: input.capabilityKey ?? null,
        resourceKey: input.resourceKey ?? null,
        actionKey: input.actionKey ?? null,
        status: GrantStatus.ACTIVE,
      },
    });
  }

  async listGrants(filters: {
    membershipId?: string;
    effect?: GrantEffect;
    targetType?: GrantTargetType;
    status?: GrantStatus;
  }) {
    return this.prisma.grant.findMany({
      where: {
        membershipId: filters.membershipId,
        effect: filters.effect,
        targetType: filters.targetType,
        status: filters.status,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listGrantsByMembership(membershipId: string) {
    return this.prisma.grant.findMany({
      where: { membershipId },
      orderBy: { createdAt: 'desc' },
    });
  }
}