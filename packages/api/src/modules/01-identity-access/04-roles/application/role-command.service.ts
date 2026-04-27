import { Inject, Injectable } from '@nestjs/common';
import { MembershipStatus, Prisma, RoleAssignmentStatus } from '@prisma/client';

import { RolesRepository } from '../roles.repository';
import { RoleSupportService } from './support/role-support.service';
import {
  ROLE_MEMBERSHIP_READER_PORT,
  type RoleMembershipReaderPort,
} from '../ports/role-membership-reader.port';
import {
  DuplicateRoleAssignmentError,
  InvalidRoleAssignmentTransitionError,
  RoleAlreadyExistsError,
  RoleAssignmentMembershipInactiveError,
  RoleAssignmentMembershipNotFoundError,
  RoleAssignmentNotFoundError,
  RoleMembershipScopeMismatchError,
  RoleNotFoundError,
  RoleRetiredError,
} from '../domain/errors/role.errors';
import { RoleDomainEvents } from '../domain/events/role.events';
import { ROLE_AUDIT_ACTIONS } from '../domain/constants/role.constants';
import { normalizeCapabilityKeys } from '../domain/rules/role-capability-normalization.rule';
import { isRoleScopeCompatibleWithMembership } from '../domain/rules/role-scope-compatibility.rule';
import { canTransitionRoleAssignmentStatus } from '../domain/rules/role-assignment-status-transition.rule';

@Injectable()
export class RoleCommandService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly roleSupportService: RoleSupportService,
    @Inject(ROLE_MEMBERSHIP_READER_PORT)
    private readonly roleMembershipReaderPort: RoleMembershipReaderPort,
  ) {}

  async createRole(
    actorId: string | null,
    dto: {
      key: string;
      name: string;
      description?: string | null;
      scopeType: 'TENANT' | 'STORE';
      capabilityKeys: string[];
      isSystem?: boolean;
    },
  ) {
    const normalizedKey = dto.key.trim().toLowerCase();
    const normalizedName = dto.name.trim();
    const normalizedDescription = dto.description?.trim() || null;

    const existing = await this.rolesRepository.findRoleByKey(normalizedKey);
    if (existing) {
      throw new RoleAlreadyExistsError();
    }

    const capabilities = normalizeCapabilityKeys(dto.capabilityKeys);
    const at = this.roleSupportService.now();

    const role = await this.rolesRepository.createRole({
      key: normalizedKey,
      name: normalizedName,
      description: normalizedDescription,
      scopeType: dto.scopeType as any,
      capabilityKeys: capabilities,
      isSystem: dto.isSystem ?? false,
    });

    await this.roleSupportService.recordAudit({
      action: ROLE_AUDIT_ACTIONS.ROLE_CREATED,
      actorId,
      targetId: role.id,
      payload: {
        key: role.key,
        scopeType: role.scopeType,
        capabilityKeys: capabilities,
      },
      at,
    });

    await this.roleSupportService.publishEvent({
      eventName: RoleDomainEvents.ROLE_CREATED,
      payload: {
        roleId: role.id,
        key: role.key,
        scopeType: role.scopeType,
        capabilityKeys: capabilities,
      },
    });

    return role;
  }

  async assignRole(
    actorId: string | null,
    dto: {
      membershipId: string;
      roleId: string;
      reason?: string | null;
    },
  ) {
    const membership = await this.roleMembershipReaderPort.findMembershipById(
      dto.membershipId,
    );
    if (!membership) {
      throw new RoleAssignmentMembershipNotFoundError();
    }

    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new RoleAssignmentMembershipInactiveError();
    }

    const role = await this.rolesRepository.findRoleById(dto.roleId);
    if (!role) {
      throw new RoleNotFoundError();
    }

    if (role.retiredAt) {
      throw new RoleRetiredError();
    }

    if (
      !isRoleScopeCompatibleWithMembership({
        roleScopeType: role.scopeType as any,
        membershipScopeType: membership.scopeType,
      })
    ) {
      throw new RoleMembershipScopeMismatchError();
    }

    const existingAssignment = await this.rolesRepository.findActiveAssignment({
      membershipId: dto.membershipId,
      roleId: dto.roleId,
    });

    if (existingAssignment) {
      throw new DuplicateRoleAssignmentError();
    }

    try {
      const assignment = await this.rolesRepository.createAssignment({
        membershipId: dto.membershipId,
        roleId: dto.roleId,
        assignedBy: actorId,
        reason: this.roleSupportService.normalizeReason(dto.reason),
      });

      const at = this.roleSupportService.now();

      await this.roleSupportService.recordAudit({
        action: ROLE_AUDIT_ACTIONS.ROLE_ASSIGNED,
        actorId,
        targetId: assignment.id,
        payload: {
          membershipId: dto.membershipId,
          roleId: dto.roleId,
          userId: membership.userId,
          tenantId: membership.tenantId,
          storeId: membership.storeId,
        },
        at,
      });

      await this.roleSupportService.publishEvent({
        eventName: RoleDomainEvents.ROLE_ASSIGNED,
        payload: {
          roleAssignmentId: assignment.id,
          membershipId: dto.membershipId,
          roleId: dto.roleId,
          userId: membership.userId,
          tenantId: membership.tenantId,
          storeId: membership.storeId,
        },
      });

      return assignment;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new DuplicateRoleAssignmentError();
      }
      throw error;
    }
  }

  async revokeRoleAssignment(
    actorId: string | null,
    assignmentId: string,
    dto: {
      reason?: string | null;
    },
  ) {
    const existing =
      await this.rolesRepository.findAssignmentById(assignmentId);
    if (!existing) {
      throw new RoleAssignmentNotFoundError();
    }

    if (
      !canTransitionRoleAssignmentStatus(
        existing.status,
        RoleAssignmentStatus.REVOKED,
      )
    ) {
      throw new InvalidRoleAssignmentTransitionError();
    }

    const revokedAt = this.roleSupportService.now();
    const result = await this.rolesRepository.revokeAssignment({
      id: assignmentId,
      expectedVersion: existing.version,
      revokedBy: actorId,
      reason: this.roleSupportService.normalizeReason(dto.reason),
      revokedAt,
    });

    if (result === 0) {
      throw new InvalidRoleAssignmentTransitionError();
    }

    await this.roleSupportService.recordAudit({
      action: ROLE_AUDIT_ACTIONS.ROLE_ASSIGNMENT_REVOKED,
      actorId,
      targetId: assignmentId,
      payload: {
        membershipId: existing.membershipId,
        roleId: existing.roleId,
      },
      at: revokedAt,
    });

    await this.roleSupportService.publishEvent({
      eventName: RoleDomainEvents.ROLE_ASSIGNMENT_REVOKED,
      payload: {
        roleAssignmentId: assignmentId,
        membershipId: existing.membershipId,
        roleId: existing.roleId,
        revokedAt,
      },
    });

    return {
      id: assignmentId,
      status: RoleAssignmentStatus.REVOKED,
      revokedAt,
    };
  }
}
