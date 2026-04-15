import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { Query } from '@nestjs/common';
import { ListRolesQueryDto } from './dto/queries/list-roles.query.dto';
import { MembershipIdParamDto } from './dto/queries/membership-id-param.dto';
import { RoleAssignmentIdParamDto } from './dto/queries/role-assignment-id-param.dto';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/commands/create-role.dto';
import { AssignRoleDto } from './dto/commands/assign-role.dto';
import { RevokeRoleDto } from './dto/commands/revoke-role.dto';
import { RoleResponseMapper } from './mappers/role-response.mapper';
import { RolePlatformAdminGuard } from './guards/role-platform-admin.guard';

@Controller('v1/roles')
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly roleResponseMapper: RoleResponseMapper,
  ) {}

  @Post()
  @UseGuards(RolePlatformAdminGuard)
  async createRole(
    @Req() req: Request & { user?: { userId?: string | null } },
    @Body() dto: CreateRoleDto,
  ) {
    const actorId = req.user?.userId ?? null;
    const role = await this.rolesService.createRole(actorId, dto);
    return this.roleResponseMapper.toRoleResponse(role);
  }

  @Get()
  @UseGuards(RolePlatformAdminGuard)
  async listRoles(@Query() query: ListRolesQueryDto) {
    const roles = await this.rolesService.listRoles(query);
    return roles.map((role) => this.roleResponseMapper.toRoleResponse(role));
  }

  @Post('assignments')
  @UseGuards(RolePlatformAdminGuard)
  async assignRole(
    @Req() req: Request & { user?: { userId?: string | null } },
    @Body() dto: AssignRoleDto,
  ) {
    const actorId = req.user?.userId ?? null;
    const assignment = await this.rolesService.assignRole(actorId, dto);
    return this.roleResponseMapper.toAssignmentResponse(assignment);
  }

  @Patch('assignments/:assignmentId/revoke')
  @UseGuards(RolePlatformAdminGuard)
  async revokeRoleAssignment(
    @Req() req: Request & { user?: { userId?: string | null } },
    @Param() params: RoleAssignmentIdParamDto,
    @Body() dto: RevokeRoleDto,
  ) {
    const actorId = req.user?.userId ?? null;
    return this.rolesService.revokeRoleAssignment(actorId, params.assignmentId, dto);
  }

  @Get('memberships/:membershipId/assignments')
  @UseGuards(RolePlatformAdminGuard)
  async listMembershipAssignments(@Param() params: MembershipIdParamDto) {
    const assignments =
      await this.rolesService.listMembershipRoleAssignments(params.membershipId);

    return assignments.map((assignment) =>
      this.roleResponseMapper.toAssignmentResponse(assignment),
    );
  }
}