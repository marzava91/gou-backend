import { AuthProvider } from '@prisma/client';

import { AuthPasswordResetService } from '../application/auth-password-reset.service';
import {
  AuthVerificationFailedError,
  ChallengeAlreadyConsumedError,
  ChallengeExpiredError,
  TooManyAttemptsError,
} from '../domain/errors/auth.errors';
import { AUTH_AUDIT_ACTIONS } from '../domain/constants/auth.constants';
import { AuthDomainEvents } from '../domain/events/auth.events';

describe('AuthPasswordResetService', () => {
  let service: AuthPasswordResetService;

  const authRepository = {
    findVerificationChallengeById: jest.fn(),
    consumePasswordResetChallengeIfValid: jest.fn(),
    findAuthIdentityById: jest.fn(),
    revokeAllActiveSessionsByUserId: jest.fn(),
  };

  const authSupportService = {
    recordAudit: jest.fn(),
    hashToken: jest.fn((value: string) => `hashed:${value}`),
  };

  const authProvider = {
    resetPassword: jest.fn(),
  };

  const authEventsPort = {
    publish: jest.fn(),
  };

  const authVerificationPort = {
    verifyChallenge: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthPasswordResetService(
      authRepository as any,
      authSupportService as any,
      authProvider as any,
      authVerificationPort as any,
      authEventsPort as any,
    );
  });

  it('completes password reset and revokes active sessions', async () => {
    const now = new Date('2026-04-09T10:00:00.000Z');

    jest.useFakeTimers().setSystemTime(now);

    authRepository.findVerificationChallengeById.mockResolvedValue({
      id: 'challenge-1',
      userId: 'user-1',
      authIdentityId: 'identity-1',
      purpose: 'PASSWORD_RESET',
      status: 'ISSUED',
    });

    authRepository.consumePasswordResetChallengeIfValid.mockResolvedValue({
      outcome: 'consumed',
      challenge: {
        id: 'challenge-1',
        userId: 'user-1',
        authIdentityId: 'identity-1',
      },
    });

    authRepository.findAuthIdentityById.mockResolvedValue({
      id: 'identity-1',
      provider: AuthProvider.PASSWORD,
    });

    authRepository.revokeAllActiveSessionsByUserId.mockResolvedValue({
      count: 3,
    });

    const result = await service.confirmPasswordReset({
      challengeId: 'challenge-1',
      code: '123456',
      newPassword: 'NewStrongPassword123!',
    });

    expect(authSupportService.hashToken).toHaveBeenCalledWith('123456');

    expect(authProvider.resetPassword).toHaveBeenCalledWith({
      userId: 'user-1',
      authIdentityId: 'identity-1',
      provider: AuthProvider.PASSWORD,
      newPassword: 'NewStrongPassword123!',
    });

    expect(authRepository.revokeAllActiveSessionsByUserId).toHaveBeenCalledWith(
      'user-1',
      now,
    );

    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      AUTH_AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      null,
      'user-1',
      {
        challengeId: 'challenge-1',
        completedAt: now,
        sessionRevocation: 'completed',
      },
    );

    expect(authEventsPort.publish).toHaveBeenCalledWith({
      eventName: AuthDomainEvents.PASSWORD_RESET_COMPLETED,
      payload: {
        challengeId: 'challenge-1',
        userId: 'user-1',
        completedAt: now,
      },
    });

    expect(result).toEqual({
      completed: true,
      challengeId: 'challenge-1',
      completedAt: now,
    });

    jest.useRealTimers();
  });

  it('throws ChallengeAlreadyConsumedError when concurrent reset already consumed the challenge', async () => {
    authRepository.findVerificationChallengeById.mockResolvedValue({
      id: 'challenge-1',
      userId: 'user-1',
      authIdentityId: 'identity-1',
      purpose: 'PASSWORD_RESET',
      status: 'ISSUED',
    });

    authRepository.consumePasswordResetChallengeIfValid.mockResolvedValue({
      outcome: 'already_used',
      challenge: {
        id: 'challenge-1',
        userId: 'user-1',
      },
    });

    await expect(
      service.confirmPasswordReset({
        challengeId: 'challenge-1',
        code: '123456',
        newPassword: 'NewStrongPassword123!',
      }),
    ).rejects.toBeInstanceOf(ChallengeAlreadyConsumedError);

    expect(authSupportService.hashToken).toHaveBeenCalledWith('123456');
    expect(authProvider.resetPassword).not.toHaveBeenCalled();
    expect(
      authRepository.revokeAllActiveSessionsByUserId,
    ).not.toHaveBeenCalled();
  });

  it('throws ChallengeExpiredError when challenge is expired', async () => {
    authRepository.findVerificationChallengeById.mockResolvedValue({
      id: 'challenge-1',
      userId: 'user-1',
      authIdentityId: 'identity-1',
      purpose: 'PASSWORD_RESET',
      status: 'ISSUED',
    });

    authRepository.consumePasswordResetChallengeIfValid.mockResolvedValue({
      outcome: 'expired',
      challenge: {
        id: 'challenge-1',
        userId: 'user-1',
      },
    });

    await expect(
      service.confirmPasswordReset({
        challengeId: 'challenge-1',
        code: '123456',
        newPassword: 'NewStrongPassword123!',
      }),
    ).rejects.toBeInstanceOf(ChallengeExpiredError);

    expect(authSupportService.hashToken).toHaveBeenCalledWith('123456');
    expect(authProvider.resetPassword).not.toHaveBeenCalled();
    expect(
      authRepository.revokeAllActiveSessionsByUserId,
    ).not.toHaveBeenCalled();
  });

  it('throws TooManyAttemptsError when invalid code reaches max attempts', async () => {
    authRepository.findVerificationChallengeById.mockResolvedValue({
      id: 'challenge-1',
      userId: 'user-1',
      authIdentityId: 'identity-1',
      purpose: 'PASSWORD_RESET',
      status: 'ISSUED',
    });

    authRepository.consumePasswordResetChallengeIfValid.mockResolvedValue({
      outcome: 'too_many_attempts',
      challenge: {
        id: 'challenge-1',
        userId: 'user-1',
      },
    });

    await expect(
      service.confirmPasswordReset({
        challengeId: 'challenge-1',
        code: '000000',
        newPassword: 'NewStrongPassword123!',
      }),
    ).rejects.toBeInstanceOf(TooManyAttemptsError);

    expect(authSupportService.hashToken).toHaveBeenCalledWith('000000');
    expect(authProvider.resetPassword).not.toHaveBeenCalled();
    expect(
      authRepository.revokeAllActiveSessionsByUserId,
    ).not.toHaveBeenCalled();
  });

  it('throws TooManyAttemptsError when challenge does not exist in current flow', async () => {
    authRepository.findVerificationChallengeById.mockResolvedValue(null);

    await expect(
      service.confirmPasswordReset({
        challengeId: 'missing-challenge',
        code: '123456',
        newPassword: 'NewStrongPassword123!',
      }),
    ).rejects.toBeInstanceOf(TooManyAttemptsError);

    expect(authSupportService.hashToken).toHaveBeenCalledWith('123456');
    expect(authProvider.resetPassword).not.toHaveBeenCalled();
    expect(
      authRepository.revokeAllActiveSessionsByUserId,
    ).not.toHaveBeenCalled();
  });

  it('records partial completion metadata when challenge has no userId', async () => {
    const now = new Date('2026-04-09T10:00:00.000Z');

    jest.useFakeTimers().setSystemTime(now);

    authRepository.findVerificationChallengeById.mockResolvedValue({
      id: 'challenge-2',
      userId: null,
      authIdentityId: 'identity-2',
      purpose: 'PASSWORD_RESET',
      status: 'ISSUED',
    });

    authRepository.consumePasswordResetChallengeIfValid.mockResolvedValue({
      outcome: 'consumed',
      challenge: {
        id: 'challenge-2',
        userId: null,
        authIdentityId: 'identity-2',
      },
    });

    authRepository.findAuthIdentityById.mockResolvedValue({
      id: 'identity-2',
      provider: AuthProvider.PASSWORD,
    });

    const result = await service.confirmPasswordReset({
      challengeId: 'challenge-2',
      code: '123456',
      newPassword: 'NewStrongPassword123!',
    });

    expect(authSupportService.hashToken).toHaveBeenCalledWith('123456');
    expect(
      authRepository.revokeAllActiveSessionsByUserId,
    ).not.toHaveBeenCalled();

    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      AUTH_AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      null,
      null,
      {
        challengeId: 'challenge-2',
        completedAt: now,
        sessionRevocation: 'not_applicable',
      },
    );

    expect(result).toEqual({
      completed: true,
      challengeId: 'challenge-2',
      completedAt: now,
    });

    jest.useRealTimers();
  });

  it('records remediation path when provider reset succeeds but session revocation fails', async () => {
    const now = new Date('2026-04-09T10:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    authRepository.findVerificationChallengeById.mockResolvedValue({
      id: 'challenge-1',
      userId: 'user-1',
      authIdentityId: 'identity-1',
      purpose: 'PASSWORD_RESET',
      status: 'ISSUED',
    });

    authRepository.consumePasswordResetChallengeIfValid.mockResolvedValue({
      outcome: 'consumed',
      challenge: {
        id: 'challenge-1',
        userId: 'user-1',
        authIdentityId: 'identity-1',
      },
    });

    authRepository.findAuthIdentityById.mockResolvedValue({
      id: 'identity-1',
      provider: AuthProvider.PASSWORD,
    });

    authRepository.revokeAllActiveSessionsByUserId.mockRejectedValue(
      new Error('db_failure_after_provider_reset'),
    );

    await expect(
      service.confirmPasswordReset({
        challengeId: 'challenge-1',
        code: '123456',
        newPassword: 'NewStrongPassword123!',
      }),
    ).rejects.toThrow('db_failure_after_provider_reset');

    expect(authSupportService.hashToken).toHaveBeenCalledWith('123456');
    expect(authProvider.resetPassword).toHaveBeenCalledTimes(1);

    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      AUTH_AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      null,
      'user-1',
      expect.objectContaining({
        challengeId: 'challenge-1',
        sessionRevocation: 'failed_after_password_reset',
      }),
    );

    jest.useRealTimers();
  });
});
