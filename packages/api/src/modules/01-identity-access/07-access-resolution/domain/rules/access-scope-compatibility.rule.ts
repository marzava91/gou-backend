// packages/api/src/modules/01-identity-and-access/07-access-resolution/domain/rules/access-scope-compatibility.rule.ts

import { MembershipScopeType, OperationalSurface } from '@prisma/client';
import { AuthorizationMembershipAnchor } from '../types/access-resolution.types';

export function isMembershipCompatibleWithSurface(input: {
  membership: AuthorizationMembershipAnchor;
  surface: OperationalSurface;
}): boolean {
  const { membership, surface } = input;

  switch (surface) {
    case OperationalSurface.PARTNERS_WEB:
      return (
        membership.scopeType === MembershipScopeType.TENANT ||
        membership.scopeType === MembershipScopeType.STORE
      );
    default:
      return false;
  }
}