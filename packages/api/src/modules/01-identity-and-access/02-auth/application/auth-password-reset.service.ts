// packages\api\src\modules\01-identity-and-access\02-auth\application\auth-password-reset.service.ts

import { Inject, Injectable } from '@nestjs/common';
import {
  AuthProvider,
  AuthVerificationChallengePurpose,
  AuthVerificationChallengeStatus,
} from '@prisma/client';

import { AuthRepository } from '../auth.repository';

import { AUTH_EVENTS_PORT } from '../ports/auth-events.port';
import type { AuthEventsPort } from '../ports/auth-events.port';

import { AUTH_PROVIDER_PORT } from '../ports/auth-provider.port';
import type { AuthProviderPort } from '../ports/auth-provider.port';

import { AUTH_VERIFICATION_PORT } from '../ports/auth-verification.port';
import type { AuthVerificationPort } from '../ports/auth-verification.port';

import {
  AUTH_AUDIT_ACTIONS,
  AUTH_SECURITY_POLICY,
} from '../domain/constants/auth.constants';
import { AuthDomainEvents } from '../domain/events/auth.events';
import {
  AuthVerificationFailedError,
  ChallengeAlreadyConsumedError,
  ChallengeExpiredError,
  TooManyAttemptsError,
} from '../domain/errors/auth.errors';

import { RequestPasswordResetDto } from '../dto/commands/request-password-reset.dto';
import { ConfirmPasswordResetDto } from '../dto/commands/confirm-password-reset.dto';

import { AuthSupportService } from './support/auth-support.service';

@Injectable()
export class AuthPasswordResetService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authSupportService: AuthSupportService,
    @Inject(AUTH_PROVIDER_PORT)
    private readonly authProvider: AuthProviderPort,
    @Inject(AUTH_VERIFICATION_PORT)
    private readonly authVerificationPort: AuthVerificationPort,
    @Inject(AUTH_EVENTS_PORT)
    private readonly authEventsPort: AuthEventsPort,
  ) {}

  /**
   * Issues a password reset challenge using AuthVerificationChallenge with
   * purpose PASSWORD_RESET.
   *
   * TODO(auth-password-reset-provider-policy):
   * Define which auth providers are eligible for password reset and whether
   * identities without password-based credentials should be silently ignored
   * or explicitly rejected in privileged flows.
   */
  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const identity = await this.authRepository.findAuthIdentityForPasswordReset(
      dto.identifier,
    );

    const expiresAt = new Date(
      Date.now() + AUTH_SECURITY_POLICY.PASSWORD_RESET.CODE_TTL_MINUTES * 60 * 1000,
    );

    if (!identity) {
      await this.authSupportService.recordAudit(
        AUTH_AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
        null,
        null,
        {
          identifierMasked: this.authSupportService.maskTarget(dto.identifier),
          resolved: false,
        },
      );

      return {
        requested: true,
        expiresAt: null,
      };
    }

    const code = this.authSupportService.generateVerificationCode();

    const challenge = await this.authRepository.createVerificationChallenge({
      userId: identity.userId,
      authIdentityId: identity.id,
      purpose: AuthVerificationChallengePurpose.PASSWORD_RESET,
      status: AuthVerificationChallengeStatus.ISSUED,
      target: identity.email ?? identity.phone ?? dto.identifier,
      codeHash: this.authSupportService.hashToken(code),
      maxAttempts: AUTH_SECURITY_POLICY.PASSWORD_RESET.MAX_ATTEMPTS,
      expiresAt,
    });

    await this.authVerificationPort.sendCode({
      userId: identity.userId,
      target: identity.email ?? identity.phone ?? dto.identifier,
      purpose: AuthVerificationChallengePurpose.PASSWORD_RESET,
      code,
      expiresAt,
    });

    await this.authSupportService.recordAudit(
      AUTH_AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      null,
      identity.userId,
      {
        challengeId: challenge.id,
        identifierMasked: this.authSupportService.maskTarget(dto.identifier),
        expiresAt,
      },
    );

    await this.authEventsPort.publish({
      eventName: AuthDomainEvents.PASSWORD_RESET_REQUESTED,
      payload: {
        challengeId: challenge.id,
        userId: identity.userId,
        expiresAt,
      },
    });

    return {
      requested: true,
      challengeId: challenge.id,
      expiresAt,
    };
  }

  /**
   * Confirms a password reset challenge, updates the provider-side credential,
   * and revokes previously active sessions for the affected user.
   *
   * Concurrency / operational model for this phase:
   * - challenge validation + consumption is protected through repository-side
   *   compare-and-set semantics
   * - provider-side password reset and DB-side session revocation remain
   *   separate side effects
   * - if provider reset succeeds but session revocation fails, the operation is
   *   recorded as partially completed and a remediation event is published
   *
   * TODO(auth-password-reset-remediation):
   * Replace event-only remediation with a durable retry/reconciliation mechanism
   * once platform-level async recovery infrastructure is available.
   */
  async confirmPasswordReset(dto: ConfirmPasswordResetDto) {
    const now = new Date();
    const expectedCodeHash = this.authSupportService.hashToken(dto.code);

    const result =
      await this.authRepository.consumePasswordResetChallengeIfValid({
        challengeId: dto.challengeId,
        expectedCodeHash,
        now,
      });

    switch (result.outcome) {
      case 'not_found':
        throw new AuthVerificationFailedError();

      case 'expired':
        await this.authSupportService.recordAudit(
          AUTH_AUDIT_ACTIONS.PASSWORD_RESET_FAILED,
          null,
          result.challenge?.userId ?? null,
          {
            challengeId: dto.challengeId,
            outcome: 'expired',
          },
        );
        throw new ChallengeExpiredError();

      case 'already_used':
        await this.authSupportService.recordAudit(
          AUTH_AUDIT_ACTIONS.PASSWORD_RESET_FAILED,
          null,
          result.challenge?.userId ?? null,
          {
            challengeId: dto.challengeId,
            outcome: 'already_used',
          },
        );
        throw new ChallengeAlreadyConsumedError();

      case 'too_many_attempts':
        await this.authSupportService.recordAudit(
          AUTH_AUDIT_ACTIONS.PASSWORD_RESET_FAILED,
          null,
          result.challenge?.userId ?? null,
          {
            challengeId: dto.challengeId,
            outcome: 'too_many_attempts',
          },
        );
        throw new TooManyAttemptsError();

      case 'invalid_code':
        await this.authSupportService.recordAudit(
          AUTH_AUDIT_ACTIONS.PASSWORD_RESET_FAILED,
          null,
          result.challenge?.userId ?? null,
          {
            challengeId: dto.challengeId,
            outcome: 'invalid_code',
          },
        );
        throw new AuthVerificationFailedError();

      case 'consumed':
        break;
    }

    const challenge = result.challenge;

    const identity = challenge.authIdentityId
      ? await this.authRepository.findAuthIdentityById(challenge.authIdentityId)
      : null;

    if (this.authProvider.resetPassword) {
      await this.authProvider.resetPassword({
        userId: challenge.userId ?? null,
        authIdentityId: challenge.authIdentityId ?? null,
        provider: identity?.provider ?? AuthProvider.PASSWORD,
        newPassword: dto.newPassword,
      });
    }

    if (challenge.userId) {
      try {
        await this.authRepository.revokeAllActiveSessionsByUserId(
          challenge.userId,
          now,
        );
      } catch (error) {
        await this.authSupportService.recordAudit(
          AUTH_AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
          null,
          challenge.userId,
          {
            challengeId: challenge.id,
            completedAt: now,
            sessionRevocation: 'failed_after_password_reset',
          },
        );

        await this.authEventsPort.publish({
          eventName:
            AuthDomainEvents.PASSWORD_RESET_SESSION_REVOCATION_PENDING,
          payload: {
            challengeId: challenge.id,
            userId: challenge.userId,
            completedAt: now,
          },
        });

        throw error;
      }
    }

    await this.authSupportService.recordAudit(
      AUTH_AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      null,
      challenge.userId ?? null,
      {
        challengeId: challenge.id,
        completedAt: now,
        sessionRevocation: challenge.userId ? 'completed' : 'not_applicable',
      },
    );

    await this.authEventsPort.publish({
      eventName: AuthDomainEvents.PASSWORD_RESET_COMPLETED,
      payload: {
        challengeId: challenge.id,
        userId: challenge.userId,
        completedAt: now,
      },
    });

    return {
      completed: true,
      challengeId: challenge.id,
      completedAt: now,
    };
  }
}

