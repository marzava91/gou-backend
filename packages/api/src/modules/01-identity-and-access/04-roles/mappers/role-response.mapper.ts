import { Injectable } from '@nestjs/common';
import type {
  RoleAssignmentResolved,
  RoleWithCapabilities,
} from '../domain/types/role.types';
import { RoleAssignmentResponseDto } from '../dto/responses/role-assignment-response.dto';
import { RoleResponseDto } from '../dto/responses/role-response.dto';

@Injectable()
export class RoleResponseMapper {
  toRoleResponse(role: RoleWithCapabilities): RoleResponseDto {
    return {
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
      scopeType: role.scopeType,
      isSystem: role.isSystem,
      retiredAt: role.retiredAt,
      version: role.version,
      capabilityKeys:
        role.capabilities?.map((item) => item.capabilityKey) ?? [],
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  toAssignmentResponse(
    assignment: RoleAssignmentResolved,
  ): RoleAssignmentResponseDto {
    return {
      id: assignment.id,
      membershipId: assignment.membershipId,
      roleId: assignment.roleId,
      status: assignment.status,
      assignedBy: assignment.assignedBy,
      revokedBy: assignment.revokedBy,
      reason: assignment.reason,
      assignedAt: assignment.assignedAt,
      revokedAt: assignment.revokedAt,
      role: assignment.role ? this.toRoleResponse(assignment.role) : null,
    };
  }
}
