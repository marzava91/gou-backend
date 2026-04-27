import { MembershipApplicableGrant } from '../domain/types/access-resolution.types';

export const ACCESS_GRANT_READER_PORT = Symbol('ACCESS_GRANT_READER_PORT');

export interface AccessGrantReaderPort {
  listMembershipGrants(membershipId: string): Promise<MembershipApplicableGrant[]>;
}