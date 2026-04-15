import { Injectable } from '@nestjs/common';
import { RoleCommandService } from './application/role-command.service';
import { RoleQueryService } from './application/role-query.service';
import { CreateRoleDto } from './dto/commands/create-role.dto';
import { AssignRoleDto } from './dto/commands/assign-role.dto';
import { RevokeRoleDto } from './dto/commands/revoke-role.dto';
import { ListRolesQueryDto } from './dto/queries/list-roles.query.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly roleCommandService: RoleCommandService,
    private readonly roleQueryService: RoleQueryService,
  ) {}

  createRole(actorId: string | null, dto: CreateRoleDto) {
    return this.roleCommandService.createRole(actorId, dto);
  }

  assignRole(actorId: string | null, dto: AssignRoleDto) {
    return this.roleCommandService.assignRole(actorId, dto);
  }

  revokeRoleAssignment(
    actorId: string | null,
    assignmentId: string,
    dto: RevokeRoleDto,
  ) {
    return this.roleCommandService.revokeRoleAssignment(actorId, assignmentId, dto);
  }

  listRoles(query?: ListRolesQueryDto) {
    return this.roleQueryService.listRoles(query);
  }

  getRoleById(roleId: string) {
    return this.roleQueryService.getRoleById(roleId);
  }

  listMembershipRoleAssignments(membershipId: string) {
    return this.roleQueryService.listMembershipRoleAssignments(membershipId);
  }
}