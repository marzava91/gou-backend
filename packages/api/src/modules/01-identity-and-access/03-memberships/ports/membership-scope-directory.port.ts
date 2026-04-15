// packages/api/src/modules/01-identity-and-access/03-memberships/ports/membership-scope-directory.port.ts

export const MEMBERSHIP_SCOPE_DIRECTORY_PORT = Symbol(
  'MEMBERSHIP_SCOPE_DIRECTORY_PORT',
);

export interface MembershipScopeDirectoryPort {
  tenantExists(tenantId: string): Promise<boolean>;

  storeExists(storeId: string): Promise<boolean>;

  storeBelongsToTenant(input: {
    storeId: string;
    tenantId: string;
  }): Promise<boolean>;
}