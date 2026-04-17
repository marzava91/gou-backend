// packages/api/src/modules/01-identity-and-access/02-auth/domain/rules/auth-provider-trust.rule.ts

import { AuthProvider } from '@prisma/client';

/**
 * Determines whether a provider can be trusted to return a canonical internal userId
 * directly in providerResult.userId.
 *
 * Federated providers (e.g. GOOGLE, APPLE) must not be trusted unless a dedicated
 * broker/identity resolution layer guarantees canonical mapping.
 */
const TRUSTED_DIRECT_USER_ID_PROVIDERS = new Set<AuthProvider>([
  AuthProvider.PASSWORD,
  AuthProvider.EMAIL_CODE,
  AuthProvider.PHONE_CODE,

  /**
   * TODO(auth-provider-contract):
   * Decide whether FIREBASE acts as a trusted identity broker that resolves
   * canonical userId internally. If not, remove it from this set.
   */
  AuthProvider.FIREBASE,
]);

export function canTrustDirectProviderUserId(provider: AuthProvider): boolean {
  return TRUSTED_DIRECT_USER_ID_PROVIDERS.has(provider);
}
