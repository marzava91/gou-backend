import { RoleAssignmentStatus } from '@prisma/client';

const VALID_TRANSITIONS: Record<RoleAssignmentStatus, RoleAssignmentStatus[]> =
  {
    [RoleAssignmentStatus.ACTIVE]: [RoleAssignmentStatus.REVOKED],
    [RoleAssignmentStatus.REVOKED]: [],
  };

export function canTransitionRoleAssignmentStatus(
  from: RoleAssignmentStatus,
  to: RoleAssignmentStatus,
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
