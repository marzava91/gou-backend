import { Injectable } from '@nestjs/common';
import { RoleAssignmentStatus } from '@prisma/client';

import { PrismaService } from '../../../../../prisma/prisma.service';
import { AccessRoleReaderPort } from '../../ports/access-role-reader.port';

@Injectable()
export class PrismaAccessRoleReaderAdapter implements AccessRoleReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveMembershipCapabilities(membershipId: string) {
    const assignments = await this.prisma.roleAssignment.findMany({
      where: {
        membershipId,
        status: RoleAssignmentStatus.ACTIVE,
        revokedAt: null,
        role: {
          retiredAt: null,
        },
      },
      include: {
        role: {
          include: {
            capabilities: true,
          },
        },
      },
    });

    return assignments.flatMap((assignment) =>
      assignment.role.capabilities.map((capability) => ({
        roleAssignmentId: assignment.id,
        roleId: assignment.role.id,
        roleKey: assignment.role.key,
        roleScopeType: assignment.role.scopeType,
        assignmentStatus: assignment.status,
        capabilityKey: capability.capabilityKey,
      })),
    );
  }
}