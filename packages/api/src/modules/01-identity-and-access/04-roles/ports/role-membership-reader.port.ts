import type { MembershipRoleAnchor } from '../domain/types/role.types';

export const ROLE_MEMBERSHIP_READER_PORT = Symbol('ROLE_MEMBERSHIP_READER_PORT');

export interface RoleMembershipReaderPort {
  findMembershipById(membershipId: string): Promise<MembershipRoleAnchor | null>;
}