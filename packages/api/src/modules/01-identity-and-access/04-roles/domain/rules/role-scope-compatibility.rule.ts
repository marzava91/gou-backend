import { MembershipScopeType, RoleScopeType } from '@prisma/client';

export function isRoleScopeCompatibleWithMembership(params: {
  roleScopeType: RoleScopeType;
  membershipScopeType: MembershipScopeType;
}): boolean {
  return params.roleScopeType === params.membershipScopeType;
}
