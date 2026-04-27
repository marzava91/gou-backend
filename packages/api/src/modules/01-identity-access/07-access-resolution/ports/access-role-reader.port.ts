import { MembershipRoleCapability } from '../domain/types/access-resolution.types';

export const ACCESS_ROLE_READER_PORT = Symbol('ACCESS_ROLE_READER_PORT');

export interface AccessRoleReaderPort {
  listActiveMembershipCapabilities(
    membershipId: string,
  ): Promise<MembershipRoleCapability[]>;
}