// packages/api/src/modules/01-identity-and-access/02-auth/adapters/providers/firebase/firebase-auth.provider.adapter.ts

import { Injectable } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';

import type { AuthProviderPort } from '../../../ports/auth-provider.port';
import type { ProviderAuthenticationResult } from '../../../domain/types/auth.types';

import {
  AuthPasswordResetFailedError,
  InvalidCredentialsError,
} from '../../../domain/errors/auth.errors';

import { FirebaseAdminProvider } from './firebase-admin.provider';
import {
  assertResolvedProviderMatchesExpectedProvider,
  resolveAuthProviderFromFirebaseSignInProvider,
} from '../../../domain/rules/auth-provider-resolution.rule';

@Injectable()
export class FirebaseAuthProviderAdapter implements AuthProviderPort {
  constructor(private readonly firebaseAdminProvider: FirebaseAdminProvider) {}

  /**
   * Transitional compatibility layer for the current AuthProviderPort contract.
   *
   * Current contract:
   * - identifier
   * - secret?
   * - provider?
   *
   * Practical rule for this phase:
   * - For brokered Firebase login flows (PASSWORD / PHONE_CODE / GOOGLE / APPLE),
   *   we expect `secret` to contain a Firebase ID token.
   * - `identifier` is kept for backward compatibility and audit/debug context,
   *   but trust comes from Firebase token verification, not from identifier alone.
   *
   * Later hardening:
   * - introduce an explicit `idToken` field in LoginDto and in AuthProviderPort.
   */
  async authenticate(params: {
    provider: AuthProvider;
    identifier?: string;
    secret?: string;
    externalToken?: string;
    deviceName?: string;
  }): Promise<ProviderAuthenticationResult> {
    const idToken = params.externalToken?.trim() || params.secret?.trim();

    if (!idToken) {
      throw new InvalidCredentialsError();
    }

    const decodedToken = await this.firebaseAdminProvider.verifyIdToken(
      idToken,
      true,
    );

    const firebaseUser = await this.firebaseAdminProvider.getUser(
      decodedToken.uid,
    );

    const signInProvider = decodedToken.firebase?.sign_in_provider ?? null;

    const resolvedProvider =
      resolveAuthProviderFromFirebaseSignInProvider(signInProvider);

    assertResolvedProviderMatchesExpectedProvider({
      resolvedProvider,
      expectedProvider: params.provider,
    });

    return {
      provider: resolvedProvider,
      providerSubject: decodedToken.uid,
      /**
       * We intentionally do not return canonical domain userId here.
       * The Auth domain must still resolve the canonical internal user through:
       * - existing AuthIdentity
       * - controlled auto-linking by verified email/phone
       */
      email: firebaseUser.email ?? null,
      emailVerified: firebaseUser.emailVerified ?? false,
      phone: firebaseUser.phoneNumber ?? null,
      phoneVerified: Boolean(firebaseUser.phoneNumber),
    };
  }

  /**
   * Used primarily for linkIdentity() flows.
   *
   * Contract rule:
   * - caller provides requested domain provider (GOOGLE / APPLE / PASSWORD / PHONE_CODE)
   * - we verify the Firebase ID token
   * - we resolve the upstream provider from Firebase claims
   * - we reject if the token provider does not match the requested one
   */
  async verifyExternalToken(params: {
    provider: AuthProvider;
    token: string;
  }): Promise<ProviderAuthenticationResult> {
    const idToken = params.token?.trim();

    if (!idToken) {
      throw new InvalidCredentialsError();
    }

    const decodedToken = await this.firebaseAdminProvider.verifyIdToken(
      idToken,
      true,
    );

    const firebaseUser = await this.firebaseAdminProvider.getUser(
      decodedToken.uid,
    );

    const signInProvider = decodedToken.firebase?.sign_in_provider ?? null;

    const resolvedProvider =
      resolveAuthProviderFromFirebaseSignInProvider(signInProvider);

    assertResolvedProviderMatchesExpectedProvider({
      resolvedProvider,
      expectedProvider: params.provider,
    });

    return {
      provider: resolvedProvider,
      providerSubject: decodedToken.uid,
      email: firebaseUser.email ?? null,
      emailVerified: firebaseUser.emailVerified ?? false,
      phone: firebaseUser.phoneNumber ?? null,
      phoneVerified: Boolean(firebaseUser.phoneNumber),
    };
  }

  /**
   * Password reset support for PASSWORD provider only.
   *
   * For this phase, we allow direct admin-side password update when the Auth
   * flow has already validated the reset challenge and resolved the identity.
   *
   * We intentionally do not support password reset for GOOGLE / APPLE.
   */
  async resetPassword(params: {
    userId?: string | null;
    authIdentityId?: string | null;
    provider: AuthProvider;
    providerSubject?: string;
    newPassword: string;
  }): Promise<void> {
    if (params.provider !== AuthProvider.PASSWORD) {
      throw new AuthPasswordResetFailedError();
    }

    const providerSubject = params.providerSubject?.trim();
    const newPassword = params.newPassword?.trim();

    if (!providerSubject || !newPassword) {
      throw new AuthPasswordResetFailedError();
    }

    try {
      await this.firebaseAdminProvider.updateUserPassword(
        providerSubject,
        newPassword,
      );
    } catch {
      throw new AuthPasswordResetFailedError();
    }
  }
}
