import { RoleAssignmentStatus } from '@prisma/client';
import { canTransitionRoleAssignmentStatus } from '../domain/rules/role-assignment-status-transition.rule';

describe('canTransitionRoleAssignmentStatus', () => {
  it('allows ACTIVE -> REVOKED', () => {
    expect(
      canTransitionRoleAssignmentStatus(
        RoleAssignmentStatus.ACTIVE,
        RoleAssignmentStatus.REVOKED,
      ),
    ).toBe(true);
  });

  it('rejects outbound transitions from REVOKED', () => {
    expect(
      canTransitionRoleAssignmentStatus(
        RoleAssignmentStatus.REVOKED,
        RoleAssignmentStatus.ACTIVE,
      ),
    ).toBe(false);
  });
});
