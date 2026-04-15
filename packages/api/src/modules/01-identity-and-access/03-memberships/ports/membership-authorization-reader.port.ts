// ports/membership-authorization-reader.port.ts

import { MembershipScopeType, MembershipStatus } from '@prisma/client';

export const MEMBERSHIP_AUTHORIZATION_READER_PORT =
  Symbol('MEMBERSHIP_AUTHORIZATION_READER_PORT');

export interface MembershipAuthorizationReaderPort {
  findAuthorizationAnchorByMembershipId(
    membershipId: string,
  ): Promise<{
    membershipId: string;
    userId: string;
    scopeType: MembershipScopeType;
    tenantId: string;
    storeId: string | null;
    status: MembershipStatus;
  } | null>;
}