// packages\api\src\modules\01-identity-and-access\02-auth\application\auth-verification.service.ts

import { Inject, Injectable } from '@nestjs/common';
import {
  AuthVerificationChallengeStatus,
} from '@prisma/client';

import { AuthRepository } from '../auth.repository';

import { AUTH_EVENTS_PORT } from '../ports/auth-events.port';
import type { AuthEventsPort } from '../ports/auth-events.port';

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

import { RequestVerificationCodeDto } from '../dto/commands/request-verification-code.dto';
import { VerifyCodeDto } from '../dto/commands/verify-code.dto';

import { AuthSupportService } from './support/auth-support.service';

@Injectable()
export class AuthVerificationService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authSupportService: AuthSupportService,
    @Inject(AUTH_VERIFICATION_PORT)
    private readonly authVerificationPort: AuthVerificationPort,
    @Inject(AUTH_EVENTS_PORT)
    private readonly authEventsPort: AuthEventsPort,
  ) {}

  /**
   * Issues and persists a verification challenge before delivering the code.
   *
   * TODO(auth-verification-delivery):
   * Define whether verificationRef should be populated with an external provider
   * reference when SMS/email delivery adapters become real infrastructure.
   */
  async requestVerificationCode(
    actorUserId: string | null,
    dto: RequestVerificationCodeDto,
  ) {
    const expiresAt = new Date(
      Date.now() + AUTH_SECURITY_POLICY.VERIFICATION.CODE_TTL_MINUTES * 60 * 1000,
    );

    const code = this.authSupportService.generateVerificationCode();

    const challenge = await this.authRepository.createVerificationChallenge({
      userId: actorUserId,
      purpose: dto.purpose,
      status: AuthVerificationChallengeStatus.ISSUED,
      target: dto.target,
      codeHash: this.authSupportService.hashToken(code),
      maxAttempts: AUTH_SECURITY_POLICY.VERIFICATION.MAX_ATTEMPTS,
      expiresAt,
    });

    await this.authVerificationPort.sendCode({
      userId: actorUserId,
      target: dto.target,
      purpose: dto.purpose,
      code,
      expiresAt,
    });

    await this.authSupportService.recordAudit(
      AUTH_AUDIT_ACTIONS.VERIFICATION_REQUESTED,
      actorUserId,
      actorUserId,
      {
        challengeId: challenge.id,
        purpose: dto.purpose,
        targetMasked: this.authSupportService.maskTarget(dto.target),
        expiresAt,
      },
    );

    await this.authEventsPort.publish({
      eventName: AuthDomainEvents.VERIFICATION_REQUESTED,
      payload: {
        challengeId: challenge.id,
        userId: actorUserId,
        purpose: dto.purpose,
        expiresAt,
      },
    });

    return {
      challengeId: challenge.id,
      expiresAt,
    };
  }

  async verifyCode(dto: VerifyCodeDto) {
    const now = new Date();
    const expectedCodeHash = this.authSupportService.hashToken(dto.code);

    const result = await this.authRepository.consumeVerificationChallengeIfValid({
      challengeId: dto.challengeId,
      expectedCodeHash,
      now,
    });

    switch (result.outcome) {
      case 'not_found':
        throw new AuthVerificationFailedError();

      case 'expired':
        await this.authSupportService.recordAudit(
          AUTH_AUDIT_ACTIONS.VERIFICATION_FAILED,
          null,
          result.challenge?.userId ?? null,
          {
            challengeId: dto.challengeId,
            reason: 'expired',
            operation: 'verify_code',
            expiredDuringVerification: true,
          }
        );
        throw new ChallengeExpiredError();

      case 'already_used':
        await this.authSupportService.recordAudit(
          AUTH_AUDIT_ACTIONS.VERIFICATION_FAILED,
          null,
          result.challenge?.userId ?? null,
          {
            challengeId: dto.challengeId,
            reason: 'already_used',
            operation: 'verify_code',
            concurrencyDetected: true,
          }
        );
        throw new ChallengeAlreadyConsumedError();

      case 'too_many_attempts':
        await this.authSupportService.recordAudit(
          AUTH_AUDIT_ACTIONS.VERIFICATION_FAILED,
          null,
          result.challenge?.userId ?? null,
          {
            challengeId: dto.challengeId,
            reason: 'too_many_attempts',
            operation: 'verify_code',
          },
        );
        throw new TooManyAttemptsError();

      case 'invalid_code':
        await this.authSupportService.recordAudit(
          AUTH_AUDIT_ACTIONS.VERIFICATION_FAILED,
          null,
          result.challenge?.userId ?? null,
          {
            challengeId: dto.challengeId,
            reason: 'invalid_code',
            attempts: result.attempts,
            operation: 'verify_code',
          },
        );
        throw new AuthVerificationFailedError();

      case 'consumed':
        break;
    }

    const challenge = result.challenge;

    await this.authSupportService.recordAudit(
      AUTH_AUDIT_ACTIONS.VERIFICATION_SUCCEEDED,
      null,
      challenge.userId ?? null,
      {
        challengeId: challenge.id,
        verifiedAt: now,
      },
    );

    await this.authEventsPort.publish({
      eventName: AuthDomainEvents.VERIFICATION_SUCCEEDED,
      payload: {
        challengeId: challenge.id,
        userId: challenge.userId,
        verifiedAt: now,
      },
    });

    return {
      verified: true,
      challengeId: challenge.id,
      verifiedAt: now,
    };
  }

}