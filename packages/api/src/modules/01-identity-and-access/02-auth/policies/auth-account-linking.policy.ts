// packages/api/src/modules/01-identity-and-access/02-auth/domain/policies/auth-account-linking.policy.ts

import { AuthProvider } from '@prisma/client';

const AUTO_LINK_ALLOWED_PROVIDERS = new Set<AuthProvider>([
  AuthProvider.GOOGLE,
  AuthProvider.APPLE,
]);

export function canAutoLinkAtLogin(provider: AuthProvider): boolean {
  return AUTO_LINK_ALLOWED_PROVIDERS.has(provider);
}

export function requiresExplicitLinking(provider: AuthProvider): boolean {
  return !canAutoLinkAtLogin(provider);
}
