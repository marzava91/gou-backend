import { RoleAssignmentStatus } from '@prisma/client';
import { RoleResponseDto } from './role-response.dto';

export class RoleAssignmentResponseDto {
  id!: string;
  membershipId!: string;
  roleId!: string;
  status!: RoleAssignmentStatus;
  assignedBy!: string | null;
  revokedBy!: string | null;
  reason!: string | null;
  assignedAt!: Date;
  revokedAt!: Date | null;
  role!: RoleResponseDto | null;
}