import type { GrantMembershipContext } from '../domain/types/grant.types';

export const GRANT_MEMBERSHIP_READER_PORT = Symbol(
  'GRANT_MEMBERSHIP_READER_PORT',
);

export interface GrantMembershipReaderPort {
  findMembershipById(
    membershipId: string,
  ): Promise<GrantMembershipContext | null>;
}
