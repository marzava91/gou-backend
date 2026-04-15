import { Injectable } from '@nestjs/common';
import { RolesRepository } from '../roles.repository';

@Injectable()
export class RoleQueryService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async listRoles(query?: { scopeType?: any }) {
    return this.rolesRepository.listRoles(query);
  }

  async getRoleById(roleId: string) {
    return this.rolesRepository.findRoleById(roleId);
  }

  async listMembershipRoleAssignments(membershipId: string) {
    return this.rolesRepository.listAssignmentsByMembership(membershipId);
  }
}