import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RoleAssignmentStatus, RoleScopeType } from '@prisma/client';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRoleById(id: string) {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        capabilities: {
          orderBy: { capabilityKey: 'asc' },
        },
      },
    });
  }

  findRoleByKey(key: string) {
    return this.prisma.role.findUnique({
      where: { key },
      include: {
        capabilities: {
          orderBy: { capabilityKey: 'asc' },
        },
      },
    });
  }
  createRole(input: {
    key: string;
    name: string;
    description?: string | null;
    scopeType: RoleScopeType;
    isSystem?: boolean;
    capabilityKeys: string[];
  }) {
    return this.prisma.role.create({
      data: {
        key: input.key,
        name: input.name,
        description: input.description ?? null,
        scopeType: input.scopeType,
        isSystem: input.isSystem ?? false,
        capabilities: {
          create: input.capabilityKeys.map((capabilityKey) => ({
            capabilityKey,
          })),
        },
      },
      include: {
        capabilities: {
          orderBy: { capabilityKey: 'asc' },
        },
      },
    });
  }

  async updateRole(input: {
    id: string;
    expectedVersion: number;
    name?: string;
    description?: string | null;
    capabilityKeys?: string[];
  }): Promise<boolean> {
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.role.updateMany({
        where: {
          id: input.id,
          version: input.expectedVersion,
          retiredAt: null,
        },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        return false;
      }

      if (input.capabilityKeys) {
        await tx.roleCapability.deleteMany({
          where: { roleId: input.id },
        });

        if (input.capabilityKeys.length > 0) {
          await tx.roleCapability.createMany({
            data: input.capabilityKeys.map((capabilityKey) => ({
              roleId: input.id,
              capabilityKey,
            })),
          });
        }
      }

      return true;
    });

    return result;
  }

  retireRole(input: { id: string; expectedVersion: number; retiredAt: Date }) {
    return this.prisma.role.updateMany({
      where: {
        id: input.id,
        version: input.expectedVersion,
        retiredAt: null,
      },
      data: {
        retiredAt: input.retiredAt,
        version: { increment: 1 },
      },
    });
  }

  listRoles(input?: { scopeType?: RoleScopeType }) {
    return this.prisma.role.findMany({
      where: {
        ...(input?.scopeType ? { scopeType: input.scopeType } : {}),
      },
      include: {
        capabilities: { orderBy: { capabilityKey: 'asc' } },
      },
      orderBy: [{ scopeType: 'asc' }, { name: 'asc' }],
    });
  }

  findActiveAssignment(params: { membershipId: string; roleId: string }) {
    return this.prisma.roleAssignment.findFirst({
      where: {
        membershipId: params.membershipId,
        roleId: params.roleId,
        status: RoleAssignmentStatus.ACTIVE,
      },
    });
  }

  createAssignment(input: {
    membershipId: string;
    roleId: string;
    assignedBy?: string | null;
    reason?: string | null;
  }) {
    return this.prisma.roleAssignment.create({
      data: {
        membershipId: input.membershipId,
        roleId: input.roleId,
        status: RoleAssignmentStatus.ACTIVE,
        assignedBy: input.assignedBy ?? null,
        reason: input.reason ?? null,
        history: {
          create: {
            fromStatus: null,
            toStatus: RoleAssignmentStatus.ACTIVE,
            changedBy: input.assignedBy ?? null,
            reason: input.reason ?? null,
          },
        },
      },
      include: {
        role: {
          include: {
            capabilities: {
              orderBy: { capabilityKey: 'asc' },
            },
          },
        },
      },
    });
  }

  findAssignmentById(id: string) {
    return this.prisma.roleAssignment.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            capabilities: {
              orderBy: { capabilityKey: 'asc' },
            },
          },
        },
      },
    });
  }

  revokeAssignment(input: {
    id: string;
    expectedVersion: number;
    revokedBy?: string | null;
    reason?: string | null;
    revokedAt: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.roleAssignment.updateMany({
        where: {
          id: input.id,
          version: input.expectedVersion,
          status: RoleAssignmentStatus.ACTIVE,
        },
        data: {
          status: RoleAssignmentStatus.REVOKED,
          revokedBy: input.revokedBy ?? null,
          revokedAt: input.revokedAt,
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        return 0;
      }

      await tx.roleAssignmentHistory.create({
        data: {
          roleAssignmentId: input.id,
          fromStatus: RoleAssignmentStatus.ACTIVE,
          toStatus: RoleAssignmentStatus.REVOKED,
          changedBy: input.revokedBy ?? null,
          reason: input.reason ?? null,
        },
      });

      return updated.count;
    });
  }

  listAssignmentsByMembership(membershipId: string) {
    return this.prisma.roleAssignment.findMany({
      where: { membershipId },
      include: {
        role: {
          include: {
            capabilities: {
              orderBy: { capabilityKey: 'asc' },
            },
          },
        },
      },
      orderBy: [{ assignedAt: 'desc' }],
    });
  }
}
