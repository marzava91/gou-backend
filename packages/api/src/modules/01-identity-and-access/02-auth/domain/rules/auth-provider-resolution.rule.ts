// packages/api/src/modules/01-identity-and-access/02-auth/domain/rules/auth-provider-resolution.rule.ts

import { AuthProvider } from '@prisma/client';
import { InvalidCredentialsError } from '../errors/auth.errors';

/**
 * Firebase sign_in_provider reference examples:
 * - password
 * - phone
 * - google.com
 * - apple.com
 * - custom
 *
 * We intentionally map the upstream Firebase provider into the canonical
 * AuthProvider enum used by the Auth domain.
 */
const FIREBASE_PROVIDER_TO_AUTH_PROVIDER: Record<string, AuthProvider> = {
  password: AuthProvider.PASSWORD,
  phone: AuthProvider.PHONE_CODE,
  'google.com': AuthProvider.GOOGLE,
  'apple.com': AuthProvider.APPLE,
};

export function resolveAuthProviderFromFirebaseSignInProvider(
  signInProvider: string | undefined | null,
): AuthProvider {
  if (!signInProvider) {
    throw new InvalidCredentialsError();
  }

  const resolved = FIREBASE_PROVIDER_TO_AUTH_PROVIDER[signInProvider];

  if (!resolved) {
    throw new InvalidCredentialsError();
  }

  return resolved;
}

/**
 * Validates that the upstream provider resolved from Firebase matches the
 * provider expected by the caller when one was explicitly requested.
 */
export function assertResolvedProviderMatchesExpectedProvider(params: {
  resolvedProvider: AuthProvider;
  expectedProvider?: AuthProvider;
}): void {
  const { resolvedProvider, expectedProvider } = params;

  if (!expectedProvider) {
    return;
  }

  /**
   * We allow FIREBASE as a technical/broker hint, but the canonical business
   * provider stored in AuthIdentity/AuthSession should remain the resolved one
   * (PASSWORD / PHONE_CODE / GOOGLE / APPLE).
   */
  if (expectedProvider === AuthProvider.FIREBASE) {
    return;
  }

  if (resolvedProvider !== expectedProvider) {
    throw new InvalidCredentialsError();
  }
}

export function isFederatedProvider(provider: AuthProvider): boolean {
  return (
    provider === AuthProvider.GOOGLE ||
    provider === AuthProvider.APPLE
  );
}