// packages\api\src\modules\01-identity-and-access\02-auth\__tests__\auth-verification.service.spec.ts

import { AuthVerificationService } from '../application/auth-verification.service';
import {
  AuthVerificationFailedError,
  ChallengeAlreadyConsumedError,
  ChallengeExpiredError,
  TooManyAttemptsError,
} from '../domain/errors/auth.errors';

import { AUTH_AUDIT_ACTIONS } from '../domain/constants/auth.constants';

import { AuthDomainEvents } from '../domain/events/auth.events';
import { AuthVerificationChallengeStatus } from '@prisma/client';

describe('AuthVerificationService', () => {
  let service: AuthVerificationService;

  const authRepository = {
    createVerificationChallenge: jest.fn(),
    consumeVerificationChallengeIfValid: jest.fn(),
  };

  const authSupportService = {
    hashToken: jest.fn((value: string) => `hashed:${value}`),
    generateVerificationCode: jest.fn(() => '123456'),
    maskTarget: jest.fn((value: string) => value),
    recordAudit: jest.fn(),
  };

  const authVerificationPort = {
    sendCode: jest.fn(),
  };

  const authEventsPort = {
    publish: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthVerificationService(
      authRepository as any,
      authSupportService as any,
      authVerificationPort as any,
      authEventsPort as any,
    );
  });

  describe('requestVerificationCode', () => {
    it('creates a verification challenge, sends the code, audits, and publishes the event', async () => {
        const now = new Date('2026-04-09T10:00:00.000Z');
        jest.useFakeTimers().setSystemTime(now);

        authRepository.createVerificationChallenge.mockResolvedValue({
        id: 'challenge-1',
        });

        const result = await service.requestVerificationCode('user-1', {
        purpose: 'VERIFY_EMAIL' as any,
        target: 'marvin@example.com',
        });

        expect(authSupportService.generateVerificationCode).toHaveBeenCalledTimes(1);
        expect(authSupportService.hashToken).toHaveBeenCalledWith('123456');

        expect(authRepository.createVerificationChallenge).toHaveBeenCalledWith(
        expect.objectContaining({
            userId: 'user-1',
            purpose: 'VERIFY_EMAIL',
            status: AuthVerificationChallengeStatus.ISSUED,
            target: 'marvin@example.com',
            codeHash: 'hashed:123456',
            maxAttempts: expect.any(Number),
            expiresAt: expect.any(Date),
        }),
        );

        expect(authVerificationPort.sendCode).toHaveBeenCalledWith(
        expect.objectContaining({
            userId: 'user-1',
            target: 'marvin@example.com',
            purpose: 'VERIFY_EMAIL',
            code: '123456',
            expiresAt: expect.any(Date),
        }),
        );

        expect(authSupportService.recordAudit).toHaveBeenCalledWith(
        AUTH_AUDIT_ACTIONS.VERIFICATION_REQUESTED,
        'user-1',
        'user-1',
        expect.objectContaining({
            challengeId: 'challenge-1',
            purpose: 'VERIFY_EMAIL',
            targetMasked: 'marvin@example.com',
            expiresAt: expect.any(Date),
        }),
        );

        expect(authEventsPort.publish).toHaveBeenCalledWith({
        eventName: AuthDomainEvents.VERIFICATION_REQUESTED,
        payload: expect.objectContaining({
            challengeId: 'challenge-1',
            userId: 'user-1',
            purpose: 'VERIFY_EMAIL',
            expiresAt: expect.any(Date),
        }),
        });

        expect(result).toEqual({
        challengeId: 'challenge-1',
        expiresAt: expect.any(Date),
        });

        jest.useRealTimers();
    });

    it('supports public verification flows with actorUserId = null', async () => {
        authRepository.createVerificationChallenge.mockResolvedValue({
        id: 'challenge-public-1',
        });

        const result = await service.requestVerificationCode(null, {
        purpose: 'LOGIN' as any,
        target: '+51987654321',
        });

        expect(authRepository.createVerificationChallenge).toHaveBeenCalledWith(
        expect.objectContaining({
            userId: null,
            purpose: 'LOGIN',
            target: '+51987654321',
        }),
        );

        expect(authVerificationPort.sendCode).toHaveBeenCalledWith(
        expect.objectContaining({
            userId: null,
            target: '+51987654321',
            purpose: 'LOGIN',
        }),
        );

        expect(authSupportService.recordAudit).toHaveBeenCalledWith(
        AUTH_AUDIT_ACTIONS.VERIFICATION_REQUESTED,
        null,
        null,
        expect.objectContaining({
            challengeId: 'challenge-public-1',
            purpose: 'LOGIN',
        }),
        );

        expect(result.challengeId).toBe('challenge-public-1');
    });
    });

  describe('verifyCode', () => {
    it('audits and publishes success when challenge is consumed', async () => {
        const now = new Date('2026-04-09T10:00:00.000Z');
        jest.useFakeTimers().setSystemTime(now);

        authRepository.consumeVerificationChallengeIfValid.mockResolvedValue({
        outcome: 'consumed',
        challenge: {
            id: 'challenge-1',
            userId: 'user-1',
            authIdentityId: 'identity-1',
            purpose: 'VERIFY_EMAIL',
            status: 'ISSUED',
            codeHash: 'hashed:123456',
            attempts: 0,
            maxAttempts: 5,
            expiresAt: new Date('2026-06-01T00:00:00.000Z'),
        },
        });

        const result = await service.verifyCode({
        challengeId: 'challenge-1',
        code: '123456',
        });

        expect(authSupportService.hashToken).toHaveBeenCalledWith('123456');

        expect(authSupportService.recordAudit).toHaveBeenCalledWith(
        AUTH_AUDIT_ACTIONS.VERIFICATION_SUCCEEDED,
        null,
        'user-1',
        {
            challengeId: 'challenge-1',
            verifiedAt: now,
        },
        );

        expect(authEventsPort.publish).toHaveBeenCalledWith({
        eventName: AuthDomainEvents.VERIFICATION_SUCCEEDED,
        payload: {
            challengeId: 'challenge-1',
            userId: 'user-1',
            verifiedAt: now,
        },
        });

        expect(result).toEqual({
        verified: true,
        challengeId: 'challenge-1',
        verifiedAt: now,
        });

        jest.useRealTimers();
    });

    it('throws AuthVerificationFailedError when challenge does not exist', async () => {
        authRepository.consumeVerificationChallengeIfValid.mockResolvedValue({
        outcome: 'not_found',
        });

        await expect(
        service.verifyCode({
            challengeId: 'missing-challenge',
            code: '123456',
        }),
        ).rejects.toBeInstanceOf(AuthVerificationFailedError);

        expect(authSupportService.recordAudit).not.toHaveBeenCalledWith(
        AUTH_AUDIT_ACTIONS.VERIFICATION_SUCCEEDED,
        expect.anything(),
        expect.anything(),
        expect.anything(),
        );
    });

    it('throws ChallengeExpiredError when challenge is expired', async () => {
        authRepository.consumeVerificationChallengeIfValid.mockResolvedValue({
        outcome: 'expired',
        challenge: {
            id: 'challenge-1',
            userId: 'user-1',
        },
        });

        await expect(
        service.verifyCode({
            challengeId: 'challenge-1',
            code: '123456',
        }),
        ).rejects.toBeInstanceOf(ChallengeExpiredError);
    });

    it('throws AuthVerificationFailedError and audits invalid_code with attempts', async () => {
        authRepository.consumeVerificationChallengeIfValid.mockResolvedValue({
        outcome: 'invalid_code',
        attempts: 3,
        challenge: {
            id: 'challenge-1',
            userId: 'user-1',
        },
        });

        await expect(
        service.verifyCode({
            challengeId: 'challenge-1',
            code: '000000',
        }),
        ).rejects.toBeInstanceOf(AuthVerificationFailedError);

        expect(authSupportService.recordAudit).toHaveBeenCalledWith(
        AUTH_AUDIT_ACTIONS.VERIFICATION_FAILED,
        null,
        'user-1',
        {
            challengeId: 'challenge-1',
            reason: 'invalid_code',
            attempts: 3,
            operation: 'verify_code',
        },
        );
    });

    it('throws ChallengeAlreadyConsumedError and audits already_used', async () => {
        authRepository.consumeVerificationChallengeIfValid.mockResolvedValue({
        outcome: 'already_used',
        challenge: {
            id: 'challenge-1',
            userId: 'user-1',
        },
        });

        await expect(
        service.verifyCode({
            challengeId: 'challenge-1',
            code: '123456',
        }),
        ).rejects.toBeInstanceOf(ChallengeAlreadyConsumedError);

        expect(authSupportService.recordAudit).toHaveBeenCalledWith(
        AUTH_AUDIT_ACTIONS.VERIFICATION_FAILED,
        null,
        'user-1',
        {
            challengeId: 'challenge-1',
            reason: 'already_used',
            operation: 'verify_code',
            concurrencyDetected: true,
        },
        );
    });

    it('throws TooManyAttemptsError and audits too_many_attempts', async () => {
        authRepository.consumeVerificationChallengeIfValid.mockResolvedValue({
        outcome: 'too_many_attempts',
        challenge: {
            id: 'challenge-1',
            userId: 'user-1',
        },
        });

        await expect(
        service.verifyCode({
            challengeId: 'challenge-1',
            code: '999999',
        }),
        ).rejects.toBeInstanceOf(TooManyAttemptsError);

        expect(authSupportService.recordAudit).toHaveBeenCalledWith(
        AUTH_AUDIT_ACTIONS.VERIFICATION_FAILED,
        null,
        'user-1',
        {
            challengeId: 'challenge-1',
            reason: 'too_many_attempts',
            operation: 'verify_code',
        },
        );
    });
  });
});



