import { AuthorizationMembershipAnchor } from '../domain/types/access-resolution.types';

export const ACCESS_MEMBERSHIP_READER_PORT = Symbol('ACCESS_MEMBERSHIP_READER_PORT');

export interface AccessMembershipReaderPort {
  findAuthorizationAnchorByMembershipId(
    membershipId: string,
  ): Promise<AuthorizationMembershipAnchor | null>;
}