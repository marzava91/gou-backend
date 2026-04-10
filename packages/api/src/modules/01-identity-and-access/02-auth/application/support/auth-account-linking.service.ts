// packages/api/src/modules/01-identity-and-access/02-auth/application/support/auth-account-linking.service.ts

import { Injectable } from '@nestjs/common';
import { Prisma, AuthProvider } from '@prisma/client';

import { AuthRepository } from '../../auth.repository';

import { AUTH_AUDIT_ACTIONS } from '../../domain/constants/auth.constants';
import { AuthDomainEvents } from '../../domain/events/auth.events';
import { AuthProviderNotLinkedError } from '../../domain/errors/auth.errors';
import { resolveSingleCandidateUserId } from '../../domain/rules/auth-account-resolution.rule';
import { canAutoLinkAtLogin } from '../../policies/auth-account-linking.policy';

import type { AuthEventsPort } from '../../ports/auth-events.port';
import { AuthSupportService } from './auth-support.service';

export type ResolveOrAutoLinkIdentityInput = {
  provider: AuthProvider;
  providerSubject: string;
  email?: string | null;
  emailVerified?: boolean;
  phone?: string | null;
  phoneVerified?: boolean;
};

export type ResolveOrAutoLinkIdentityResult = {
  resolvedUserId: string;
  authIdentity: {
    id: string;
    userId: string;
    provider: AuthProvider;
    providerSubject: string;
    email?: string | null;
    phone?: string | null;
    emailVerified?: boolean;
    phoneVerified?: boolean;
  } | null;
  autoLinked: boolean;
};

@Injectable()
export class AuthAccountLinkingService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authSupportService: AuthSupportService,
    private readonly authEventsPort: AuthEventsPort,
  ) {}

  /**
   * Resolves an already-linked identity or performs controlled auto-linking
   * using verified broker-provided signals.
   *
   * Rules:
   * - provider identity lookup always wins first
   * - auto-linking is only allowed for providers enabled by policy
   * - only verified email / verified phone may participate
   * - canonical resolution happens against candidate internal users
   * - if resolution is ambiguous or impossible, the method fails
   */
  async resolveOrAutoLinkIdentity(
    input: ResolveOrAutoLinkIdentityInput,
  ): Promise<ResolveOrAutoLinkIdentityResult> {
    const existingIdentity = await this.authRepository.findAuthIdentityByProvider(
      input.provider,
      input.providerSubject,
    );

    if (existingIdentity) {
      return {
        resolvedUserId: existingIdentity.userId,
        authIdentity: existingIdentity,
        autoLinked: false,
      };
    }

    if (!canAutoLinkAtLogin(input.provider)) {
      throw new AuthProviderNotLinkedError();
    }

    const verifiedEmailCandidates =
      input.email && input.emailVerified
        ? await this.authRepository.findCandidateUserIdsByVerifiedEmail(
            input.email,
          )
        : [];

    const verifiedPhoneCandidates =
      input.phone && input.phoneVerified
        ? await this.authRepository.findCandidateUserIdsByVerifiedPhone(
            input.phone,
          )
        : [];

    const resolution = resolveSingleCandidateUserId({
      emailCandidateUserIds: verifiedEmailCandidates,
      phoneCandidateUserIds: verifiedPhoneCandidates,
    });

    if (!resolution) {
      await this.authSupportService.recordAudit(
        AUTH_AUDIT_ACTIONS.LOGIN_FAILED,
        null,
        null,
        {
          reason: 'identity_not_linked',
          provider: input.provider,
        },
      );

      throw new AuthProviderNotLinkedError();
    }

    if (resolution.kind === 'conflict') {
      await this.authSupportService.recordAudit(
        AUTH_AUDIT_ACTIONS.LOGIN_FAILED,
        null,
        null,
        {
          reason: 'account_resolution_conflict',
          provider: input.provider,
          candidateUserIdsCount: resolution.candidateUserIdsCount,
          emailMatched: resolution.emailMatched,
          phoneMatched: resolution.phoneMatched,
        },
      );

      throw new AuthProviderNotLinkedError();
    }

    const resolvedUserId = resolution.userId;

    const existingIdentityForProvider =
      await this.authRepository.findAuthIdentityByUserIdAndProvider(
        resolvedUserId,
        input.provider,
      );

    if (existingIdentityForProvider) {
      return {
        resolvedUserId,
        authIdentity: existingIdentityForProvider,
        autoLinked: false,
      };
    }

    try {
      const createdIdentity = await this.authRepository.createAuthIdentity({
        userId: resolvedUserId,
        provider: input.provider,
        providerSubject: input.providerSubject,
        email: input.email ?? null,
        phone: input.phone ?? null,
        emailVerified: input.emailVerified ?? false,
        phoneVerified: input.phoneVerified ?? false,
      });

      await this.authSupportService.recordAudit(
        AUTH_AUDIT_ACTIONS.PROVIDER_LINKED,
        resolvedUserId,
        resolvedUserId,
        {
          authIdentityId: createdIdentity.id,
          provider: input.provider,
          providerSubject: input.providerSubject,
          linkingStrategy:
            input.email && input.emailVerified
              ? 'verified_email'
              : 'verified_phone',
          outcome: 'linked_during_login',
          operation: 'auto_link_identity',
        },
      );

      await this.authEventsPort.publish({
        eventName: AuthDomainEvents.PROVIDER_LINKED,
        payload: {
          userId: resolvedUserId,
          authIdentityId: createdIdentity.id,
          provider: input.provider,
          linkingStrategy:
            input.email && input.emailVerified
              ? 'verified_email'
              : 'verified_phone',
        },
      });

      return {
        resolvedUserId,
        authIdentity: createdIdentity,
        autoLinked: true,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrentGlobalIdentity =
          await this.authRepository.findAuthIdentityByProvider(
            input.provider,
            input.providerSubject,
          );

        if (concurrentGlobalIdentity) {
          if (concurrentGlobalIdentity.userId !== resolvedUserId) {
            throw new AuthProviderNotLinkedError();
          }

          await this.authSupportService.recordAudit(
            AUTH_AUDIT_ACTIONS.PROVIDER_LINKED,
            resolvedUserId,
            resolvedUserId,
            {
              authIdentityId: concurrentGlobalIdentity.id,
              provider: input.provider,
              providerSubject: input.providerSubject,
              outcome: 'already_linked_after_concurrency',
              operation: 'auto_link_identity',
              concurrencyDetected: true,
            },
          );

          return {
            resolvedUserId,
            authIdentity: concurrentGlobalIdentity,
            autoLinked: false,
          };
        }

        const concurrentUserProviderIdentity =
          await this.authRepository.findAuthIdentityByUserIdAndProvider(
            resolvedUserId,
            input.provider,
          );

        if (concurrentUserProviderIdentity) {
          await this.authSupportService.recordAudit(
            AUTH_AUDIT_ACTIONS.PROVIDER_LINKED,
            resolvedUserId,
            resolvedUserId,
            {
              authIdentityId: concurrentUserProviderIdentity.id,
              provider: input.provider,
              providerSubject: input.providerSubject,
              outcome: 'already_linked_after_concurrency',
              operation: 'auto_link_identity',
              concurrencyDetected: true,
            },
          );

          return {
            resolvedUserId,
            authIdentity: concurrentUserProviderIdentity,
            autoLinked: false,
          };
        }
      }

      throw error;
    }
  }
}