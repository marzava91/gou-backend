// packages\api\src\modules\01-identity-and-access\01-users\domain\types\user.types.ts

/**
 * AuthenticatedActor
 *
 * Represents the resolved identity and access context of the current request actor.
 *
 * TODO(identity-access):
 * - Move to 07-access-resolution once access context resolution is implemented.
 * - Extend to include:
 *   - effectiveRoles
 *   - resolvedPermissions
 *   - activeTenantId / activeStoreId
 *   - session metadata (ip, device, etc.)
 * - Ensure alignment with Auth, Memberships, Roles, and Grants modules.
 *
 * TEMPORARY LOCATION:
 * This type is colocated in Users to avoid premature cross-module abstractions.
 *
 * TEMPORARY:
 * This type is a transitional representation of the authenticated actor.
 *
 * It will be replaced by a fully resolved access context in the Access Resolution module.
 *
 * IMPORTANT:
 * Users module must not become the owner of authorization logic or permission modeling.
 */

export interface AuthenticatedActor {
  userId: string;
  subject?: string;
  email?: string | null;
  phone?: string | null;
  isPlatformAdmin?: boolean;
  tenantIds?: string[];
  storeIds?: string[];
  permissions?: string[];
}
