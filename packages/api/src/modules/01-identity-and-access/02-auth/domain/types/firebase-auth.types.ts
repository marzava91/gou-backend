// packages/api/src/modules/01-identity-and-access/02-auth/domain/types/firebase-auth.types.ts

import type { AuthProvider } from '@prisma/client';

/**
 * Minimal normalized Firebase token view used by the Auth adapter layer.
 *
 * We intentionally keep this type independent from firebase-admin concrete types
 * so the domain/application layer does not depend directly on SDK internals.
 */
export type FirebaseDecodedTokenView = {
  uid: string;
  email?: string | null;
  emailVerified?: boolean;
  phoneNumber?: string | null;
  firebase?: {
    sign_in_provider?: string | null;
  } | null;
};

/**
 * Canonical upstream provider ids commonly emitted by Firebase.
 */
export type FirebaseSignInProvider =
  | 'password'
  | 'phone'
  | 'google.com'
  | 'apple.com'
  | 'custom'
  | string;

/**
 * Trusted verified signals extracted from Firebase after backend verification.
 *
 * These signals are allowed to participate in controlled account resolution /
 * auto-linking only when explicitly verified by the broker.
 */
export type FirebaseTrustedSignals = {
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
};

/**
 * Normalized broker-authenticated identity payload returned by the Firebase
 * adapter before the Auth domain resolves the canonical internal userId.
 *
 * Important:
 * - providerSubject is the stable broker-authenticated subject (firebase uid)
 * - userId is intentionally not resolved here by default
 * - canonical internal user resolution remains an Auth domain responsibility
 */
export type FirebaseBrokerAuthenticationResult = {
  provider: AuthProvider;
  providerSubject: string;
  userId?: string | null;
  email?: string | null;
  emailVerified?: boolean;
  phone?: string | null;
  phoneVerified?: boolean;
  broker: 'firebase';
  brokerUserId: string;
  upstreamProvider: FirebaseSignInProvider;
};

/**
 * Helper input used when building a broker-authenticated result from decoded
 * Firebase token data plus user record data.
 */
export type FirebaseAuthenticationMaterial = {
  resolvedProvider: AuthProvider;
  providerSubject: string;
  upstreamProvider: FirebaseSignInProvider;
  trustedSignals: FirebaseTrustedSignals;
};
