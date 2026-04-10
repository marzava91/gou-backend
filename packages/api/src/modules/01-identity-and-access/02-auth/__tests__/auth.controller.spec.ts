// packages/api/src/modules/01-identity-and-access/02-auth/__tests__/auth.controller.spec.ts

import { AuthProvider, AuthSessionStatus } from '@prisma/client';

import { AuthController } from '../auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  const authService = {
    login: jest.fn(),
    refreshSession: jest.fn(),
    logout: jest.fn(),
    logoutAllSessions: jest.fn(),
    requestVerificationCode: jest.fn(),
    verifyCode: jest.fn(),
    requestPasswordReset: jest.fn(),
    confirmPasswordReset: jest.fn(),
    getCurrentAuthContext: jest.fn(),
    linkIdentity: jest.fn(),
    unlinkIdentity: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(authService as any);
  });

  it('delegates login to AuthService', async () => {
    authService.login.mockResolvedValue({ sessionId: 'session-1' });

    const dto = {
      identifier: 'marvin@example.com',
      secret: 'super-secret',
      provider: AuthProvider.PASSWORD,
    };

    const result = await controller.login(dto as any);

    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ sessionId: 'session-1' });
  });

  it('delegates refreshSession to AuthService', async () => {
    authService.refreshSession.mockResolvedValue({ sessionId: 'session-1' });

    const dto = { refreshToken: 'refresh-token-1' };

    const result = await controller.refreshSession(dto as any);

    expect(authService.refreshSession).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ sessionId: 'session-1' });
  });

  it('delegates logout using actor.userId', async () => {
    authService.logout.mockResolvedValue(undefined);

    const actor = {
      userId: 'user-1',
      sessionId: 'session-1',
      authIdentityId: 'identity-1',
      provider: AuthProvider.PASSWORD,
    };

    const dto = { sessionId: 'session-1' };

    await controller.logout(actor as any, dto as any);

    expect(authService.logout).toHaveBeenCalledWith('user-1', dto);
  });

  it('delegates logoutAllSessions using actor.userId', async () => {
    authService.logoutAllSessions.mockResolvedValue(undefined);

    const actor = {
      userId: 'user-1',
      sessionId: 'session-1',
      authIdentityId: 'identity-1',
      provider: AuthProvider.PASSWORD,
    };

    await controller.logoutAllSessions(actor as any);

    expect(authService.logoutAllSessions).toHaveBeenCalledWith('user-1');
  });

  it('delegates requestVerificationCode with public actorUserId = null', async () => {
    authService.requestVerificationCode.mockResolvedValue({
        challengeId: 'challenge-1',
    });

    const dto = {
        purpose: 'VERIFY_EMAIL',
        target: 'marvin@example.com',
    };

    const result = await controller.requestVerificationCode(dto as any);

    expect(authService.requestVerificationCode).toHaveBeenCalledWith(null, dto);
    expect(result).toEqual({ challengeId: 'challenge-1' });
  });

  it('delegates verifyCode to AuthService', async () => {
    authService.verifyCode.mockResolvedValue({
      verified: true,
      challengeId: 'challenge-1',
    });

    const dto = {
      challengeId: 'challenge-1',
      code: '123456',
    };

    const result = await controller.verifyCode(dto as any);

    expect(authService.verifyCode).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      verified: true,
      challengeId: 'challenge-1',
    });
  });

  it('delegates getCurrentAuthContext with actor', async () => {
    authService.getCurrentAuthContext.mockResolvedValue({
      userId: 'user-1',
      sessionId: 'session-1',
      sessionStatus: AuthSessionStatus.ACTIVE,
      identities: [],
    });

    const actor = {
      userId: 'user-1',
      sessionId: 'session-1',
      authIdentityId: 'identity-1',
      provider: AuthProvider.PASSWORD,
    };

    const result = await controller.getCurrentAuthContext(actor as any);

    expect(authService.getCurrentAuthContext).toHaveBeenCalledWith(actor);
    expect(result).toEqual({
      userId: 'user-1',
      sessionId: 'session-1',
      sessionStatus: AuthSessionStatus.ACTIVE,
      identities: [],
    });
  });

  it('delegates linkIdentity using actor.userId', async () => {
    authService.linkIdentity.mockResolvedValue({
      linked: true,
      alreadyLinked: false,
    });

    const actor = {
      userId: 'user-1',
      sessionId: 'session-1',
      authIdentityId: 'identity-1',
      provider: AuthProvider.PASSWORD,
    };

    const dto = {
      provider: AuthProvider.GOOGLE,
      externalToken: 'token-1',
    };

    const result = await controller.linkIdentity(actor as any, dto as any);

    expect(authService.linkIdentity).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual({
      linked: true,
      alreadyLinked: false,
    });
  });

  it('delegates unlinkIdentity using actor.userId', async () => {
    authService.unlinkIdentity.mockResolvedValue({ unlinked: true });

    const actor = {
      userId: 'user-1',
      sessionId: 'session-1',
      authIdentityId: 'identity-1',
      provider: AuthProvider.PASSWORD,
    };

    const dto = {
      provider: AuthProvider.GOOGLE,
    };

    const result = await controller.unlinkIdentity(actor as any, dto as any);

    expect(authService.unlinkIdentity).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual({ unlinked: true });
  });

  it('delegates requestPasswordReset to AuthService', async () => {
    authService.requestPasswordReset.mockResolvedValue({
        challengeId: 'challenge-reset-1',
    });

    const dto = {
        identifier: 'marvin@example.com',
    };

    const result = await controller.requestPasswordReset(dto as any);

    expect(authService.requestPasswordReset).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ challengeId: 'challenge-reset-1' });
  });

    it('delegates confirmPasswordReset to AuthService', async () => {
    authService.confirmPasswordReset.mockResolvedValue({
        reset: true,
    });

    const dto = {
        challengeId: 'challenge-reset-1',
        code: '123456',
        newPassword: 'NewPassword123!',
    };

    const result = await controller.confirmPasswordReset(dto as any);

    expect(authService.confirmPasswordReset).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ reset: true });
  });
});