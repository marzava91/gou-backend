// packages/api/src/modules/01-identity-and-access/02-auth/ports/auth-provider.port.ts

/**
 * Auth provider contract
 *
 * Responsibilities of the provider adapter:
 * - validate credentials or external tokens against the auth broker/provider
 * - normalize the authentication result into a stable domain contract
 * - return only trusted signals obtained from the provider/broker
 *
 * Non-responsibilities:
 * - resolve canonical internal user ownership
 * - create platform sessions
 * - decide auto-linking vs. rejection
 * - treat any external subject as canonical domain identity
 *
 * For this platform phase, Firebase acts as the central auth broker for:
 * - email + password
 * - phone + SMS
 * - Google Sign-In
 * - Apple Sign-In
 *
 * The Auth application layer remains responsible for resolving the result
 * toward a canonical internal userId and deciding whether a new AuthIdentity
 * should be linked or rejected.
 */

import type { AuthProvider } from '@prisma/client';
import type { ProviderAuthenticationResult } from '../domain/types/auth.types';

export const AUTH_PROVIDER_PORT = Symbol('AUTH_PROVIDER_PORT');

export interface AuthProviderPort {
  /**
   * Authenticates a user through the configured auth broker/provider flow.
   *
   * Supported inputs by flow:
   * - PASSWORD: identifier + secret, or externalToken if brokered upstream
   * - PHONE_CODE: externalToken from brokered phone authentication flow
   * - GOOGLE: externalToken (broker-verified identity token / Firebase ID token)
   * - APPLE: externalToken (broker-verified identity token / Firebase ID token)
   *
   * The adapter must return:
   * - the normalized domain provider actually used
   * - a stable providerSubject
   * - trusted verified signals (email / phone)
   *
   * The adapter must NOT resolve or return canonical internal user ownership.
   * Any returned external subject (for example Firebase UID) must be treated
   * only as providerSubject, never as canonical internal userId.
   */
  authenticate(params: {
    provider: AuthProvider;
    identifier?: string;
    secret?: string;
    externalToken?: string;
    deviceName?: string;
  }): Promise<ProviderAuthenticationResult>;

  /**
   * Verifies an external token for controlled identity-linking flows.
   *
   * Typical use:
   * - link GOOGLE identity to an existing authenticated user
   * - link APPLE identity to an existing authenticated user
   *
   * The adapter must not create, link, or mutate any AuthIdentity here.
   * It only validates the token and returns normalized trusted signals.
   */
  verifyExternalToken?(params: {
    provider: AuthProvider;
    token: string;
  }): Promise<ProviderAuthenticationResult>;

  /**
   * Resets password in the underlying provider/broker when that flow is
   * still owned by the Auth submodule.
   *
   * This remains optional because some deployments may externalize password
   * reset orchestration entirely to the broker.
   */
  resetPassword?(params: {
    userId?: string | null;
    authIdentityId?: string | null;
    provider: AuthProvider;
    providerSubject?: string;
    newPassword: string;
  }): Promise<void>;
}
