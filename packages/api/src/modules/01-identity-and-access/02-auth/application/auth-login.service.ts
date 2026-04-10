// packages\api\src\modules\01-identity-and-access\02-auth\application\auth-login.service.ts

import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  AuthProvider,
  AuthSessionStatus,
  AuthIdentity,
} from '@prisma/client';

import { AuthRepository } from '../auth.repository';
import { AuthResponseMapper } from '../mappers/auth-response.mapper';

import { AUTH_EVENTS_PORT } from '../ports/auth-events.port';
import type { AuthEventsPort } from '../ports/auth-events.port';

import { AUTH_PROVIDER_PORT } from '../ports/auth-provider.port';
import type { AuthProviderPort } from '../ports/auth-provider.port';

import { AUTH_TOKEN_ISSUER_PORT } from '../ports/auth-token-issuer.port';
import type { AuthTokenIssuerPort } from '../ports/auth-token-issuer.port';

import {
  AUTH_AUDIT_ACTIONS,
} from '../domain/constants/auth.constants';

import { AuthDomainEvents } from '../domain/events/auth.events';
import { isUserAuthenticable } from '../domain/rules/auth-user-authenticable.rule';
import { resolveSingleCandidateUserId } from '../domain/rules/auth-account-resolution.rule';
import { canAutoLinkAtLogin } from '../policies/auth-account-linking.policy';

import type { ProviderAuthenticationResult } from '../domain/types/auth.types';

import {
  AuthProviderNotLinkedError,
  UserNotAuthenticableError,
} from '../domain/errors/auth.errors';

import { LoginDto } from '../dto/commands/login.dto';

import { AuthSupportService } from './support/auth-support.service';

@Injectable()
export class AuthLoginService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authSupportService: AuthSupportService,
    @Inject(AUTH_PROVIDER_PORT)
    private readonly authProvider: AuthProviderPort,
    @Inject(AUTH_TOKEN_ISSUER_PORT)
    private readonly tokenIssuer: AuthTokenIssuerPort,
    @Inject(AUTH_EVENTS_PORT)
    private readonly authEventsPort: AuthEventsPort,
  ) {}

  /**
   * Canonical identity resolution policy:
   * - external provider/broker results never define canonical internal userId
   * - providerResult.providerSubject is treated only as external subject
   * - canonical resolution must occur only through:
   *   1) existing AuthIdentity linkage, or
   *   2) controlled auto-linking via verified email/phone signals
   *
   * In the Firebase-backed MVP, providerSubject will typically be the Firebase UID,
   * but it must never be treated as canonical internal User.id.
   */

  /**
   * If the provider identity is not yet linked, try controlled auto-linking
   * using trusted verified signals from the provider payload.
   *
   * Priority:
   * 1) verified email
   * 2) verified phone
   *
   * Auto-linking is allowed only for providers explicitly enabled by policy
   * and only when the verified signals resolve to a single canonical user.
   */

  async login(dto: LoginDto) {
    if (
      (dto.provider === AuthProvider.GOOGLE ||
        dto.provider === AuthProvider.APPLE ||
        dto.provider === AuthProvider.PHONE_CODE) &&
      !dto.externalToken
    ) {
      await this.authSupportService.recordAudit(
        AUTH_AUDIT_ACTIONS.LOGIN_FAILED,
        null,
        null,
        {
          reason: 'missing_external_token',
          provider: dto.provider,
        },
      );

      throw new AuthProviderNotLinkedError();
    }

    if (dto.provider === AuthProvider.PASSWORD && !dto.secret) {
      await this.authSupportService.recordAudit(
        AUTH_AUDIT_ACTIONS.LOGIN_FAILED,
        null,
        null,
        {
          reason: 'missing_secret',
          provider: dto.provider,
        },
      );

      throw new AuthProviderNotLinkedError();
    }

    const providerResult = await this.authProvider.authenticate({
      provider: dto.provider,
      identifier: dto.identifier,
      secret: dto.secret,
      externalToken: dto.externalToken,
      deviceName: dto.deviceName,
    });

    if (providerResult.provider !== dto.provider) {
      await this.authSupportService.recordAudit(
        AUTH_AUDIT_ACTIONS.LOGIN_FAILED,
        null,
        null,
        {
          reason: 'provider_mismatch',
          expectedProvider: dto.provider,
          resolvedProvider: providerResult.provider,
        },
      );

      throw new AuthProviderNotLinkedError();
    }

    let authIdentity = await this.authRepository.findAuthIdentityByProvider(
      providerResult.provider,
      providerResult.providerSubject,
    );

    let resolvedUserId = authIdentity?.userId ?? null;

    /**
     * If the provider identity is not yet linked, try controlled auto-linking
     * using trusted verified signals from the provider payload.
     *
     * Priority:
     * 1) verified email
     * 2) verified phone
     *
     * We only auto-link when the signal is explicitly verified. This avoids
     * incorrectly attaching federated/opaque identities to an existing user.
     *
     * TODO(auth-account-linking-policy):
     * Revisit whether account resolution should prefer canonical User contact
     * fields in addition to AuthIdentity matches, and define conflict handling
     * if multiple historical identities match the same verified signal.
     *
     * TODO(auth-provider-integration-phase):
     * Once Auth flows and automated tests are stabilized, replace noop provider
     * adapters with real integrations backed by Firebase as auth broker for:
     * - email/password
     * - phone authentication
     * - Google Sign-In
     * - Apple Sign-In
     * - production-grade token verification
     */
    if (!resolvedUserId) {
      resolvedUserId = await this.resolveUserIdForAutoLink(providerResult);

      if (resolvedUserId) {
        const linkedIdentityResult =
          await this.resolveLinkedIdentityAfterAutoLink({
            resolvedUserId,
            providerResult,
          });

        authIdentity = linkedIdentityResult.authIdentity;

        await this.authSupportService.recordAudit(
          AUTH_AUDIT_ACTIONS.PROVIDER_LINKED,
          resolvedUserId,
          resolvedUserId,
          {
            authIdentityId: authIdentity.id,
            provider: providerResult.provider,
            providerSubject: authIdentity.providerSubject,
            linkingStrategy: providerResult.emailVerified
              ? 'verified_email'
              : 'verified_phone',
            autoLinkedAtLogin: true,
            outcome: linkedIdentityResult.fromConcurrency
              ? 'already_linked_after_concurrency'
              : 'linked',
          },
        );

        await this.authEventsPort.publish({
          eventName: AuthDomainEvents.PROVIDER_LINKED,
          payload: {
            userId: resolvedUserId,
            authIdentityId: authIdentity.id,
            provider: providerResult.provider,
            linkingStrategy: providerResult.emailVerified
              ? 'verified_email'
              : 'verified_phone',
            autoLinkedAtLogin: true,
          },
        });
      }
    }

    if (!resolvedUserId) {
      await this.authSupportService.recordAudit(
        AUTH_AUDIT_ACTIONS.LOGIN_FAILED,
        null,
        null,
        {
          reason: 'identity_not_linked',
          provider: providerResult.provider,
        },
      );

      throw new AuthProviderNotLinkedError();
    }

    const user = await this.authRepository.findUserAuthProfileById(resolvedUserId);

    if (!user || !isUserAuthenticable(user.status)) {
      await this.authSupportService.recordAudit(
        AUTH_AUDIT_ACTIONS.LOGIN_FAILED,
        null,
        resolvedUserId,
        {
          reason: 'user_not_authenticable',
          provider: providerResult.provider,
          userStatus: user?.status ?? null,
        },
      );

      throw new UserNotAuthenticableError();
    }

    const accessTokenResult = await this.tokenIssuer.issueAccessToken({
      userId: resolvedUserId,
      provider: providerResult.provider,
    });

    const refreshTokenResult = await this.tokenIssuer.issueRefreshToken?.({
      userId: resolvedUserId,
      provider: providerResult.provider,
    });

    const createdSession = await this.authRepository.createAuthSession({
      userId: resolvedUserId,
      authIdentityId: authIdentity?.id ?? null,
      provider: providerResult.provider,
      status: AuthSessionStatus.ISSUED,
      accessTokenHash: this.authSupportService.hashToken(accessTokenResult.token),
      refreshTokenHash: refreshTokenResult
        ? this.authSupportService.hashToken(refreshTokenResult.token)
        : null,
      deviceName: dto.deviceName ?? null,
      expiresAt: accessTokenResult.expiresAt,
      refreshExpiresAt: refreshTokenResult?.expiresAt ?? null,
    });

    await this.authSupportService.recordAudit(
      AUTH_AUDIT_ACTIONS.LOGIN_SUCCEEDED,
      resolvedUserId,
      resolvedUserId,
      {
        sessionId: createdSession.id,
        provider: providerResult.provider,
        authIdentityId: authIdentity?.id ?? null,
      },
    );

    await this.authEventsPort.publish({
      eventName: AuthDomainEvents.SESSION_ISSUED,
      payload: {
        sessionId: createdSession.id,
        userId: resolvedUserId,
        provider: providerResult.provider,
      },
    });

    return AuthResponseMapper.toSessionResponse({
      sessionId: createdSession.id,
      userId: resolvedUserId,
      provider: providerResult.provider,
      status: createdSession.status,
      accessToken: accessTokenResult.token,
      refreshToken: refreshTokenResult?.token ?? null,
      expiresAt: accessTokenResult.expiresAt,
      refreshExpiresAt: refreshTokenResult?.expiresAt ?? null,
    });
  }

  private async resolveUserIdForAutoLink(
    providerResult: ProviderAuthenticationResult,
  ): Promise<string | null> {
    if (!canAutoLinkAtLogin(providerResult.provider)) {
      return null;
    }

    const hasVerifiedEmail =
      Boolean(providerResult.email) && Boolean(providerResult.emailVerified);

    const hasVerifiedPhone =
      Boolean(providerResult.phone) && Boolean(providerResult.phoneVerified);

    if (!hasVerifiedEmail && !hasVerifiedPhone) {
      return null;
    }

    const emailCandidateUserIds = hasVerifiedEmail
      ? await this.authRepository.findCandidateUserIdsByVerifiedEmail(
          providerResult.email!,
        )
      : [];

    const phoneCandidateUserIds = hasVerifiedPhone
      ? await this.authRepository.findCandidateUserIdsByVerifiedPhone(
          providerResult.phone!,
        )
      : [];

    const resolution = resolveSingleCandidateUserId({
      emailCandidateUserIds,
      phoneCandidateUserIds,
    });

    if (!resolution) {
      return null;
    }

    if (resolution.kind === 'resolved') {
      return resolution.userId;
    }

    await this.authSupportService.recordAudit(
      AUTH_AUDIT_ACTIONS.LOGIN_FAILED,
      null,
      null,
      {
        reason: 'account_resolution_conflict',
        provider: providerResult.provider,
        candidateUserIdsCount: resolution.candidateUserIdsCount,
        emailMatched: resolution.emailMatched,
        phoneMatched: resolution.phoneMatched,
      },
    );

    return null;
  }

  private async resolveLinkedIdentityAfterAutoLink(params: {
    resolvedUserId: string;
    providerResult: ProviderAuthenticationResult;
  }): Promise<{
    authIdentity: AuthIdentity;
    createdNow: boolean;
    fromConcurrency: boolean;
  }> {
    let authIdentity: AuthIdentity | null =
      await this.authRepository.findAuthIdentityByUserIdAndProvider(
        params.resolvedUserId,
        params.providerResult.provider,
      );

    if (authIdentity) {
      return {
        authIdentity,
        createdNow: false,
        fromConcurrency: false,
      };
    }

    let createdIdentity: AuthIdentity | null = null;

    try {
      createdIdentity = await this.authRepository.createAuthIdentity({
        userId: params.resolvedUserId,
        provider: params.providerResult.provider,
        providerSubject: params.providerResult.providerSubject,
        email: params.providerResult.email ?? null,
        phone: params.providerResult.phone ?? null,
        emailVerified: params.providerResult.emailVerified ?? false,
        phoneVerified: params.providerResult.phoneVerified ?? false,
      });

      authIdentity = createdIdentity;
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const concurrentGlobalIdentity =
        await this.authRepository.findAuthIdentityByProvider(
          params.providerResult.provider,
          params.providerResult.providerSubject,
        );

      if (concurrentGlobalIdentity?.userId === params.resolvedUserId) {
        authIdentity = concurrentGlobalIdentity;
      } else {
        const concurrentIdentityForResolvedUser =
          await this.authRepository.findAuthIdentityByUserIdAndProvider(
            params.resolvedUserId,
            params.providerResult.provider,
          );

        if (!concurrentIdentityForResolvedUser) {
          throw error;
        }

        authIdentity = concurrentIdentityForResolvedUser;
      }
    }

    if (!authIdentity) {
      throw new AuthProviderNotLinkedError();
    }

    return {
      authIdentity,
      createdNow: Boolean(createdIdentity),
      fromConcurrency: !createdIdentity,
    };
  }

  private isUniqueConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}

