// packages\api\src\modules\01-identity-and-access\02-auth\__tests__\auth-session.service.spec.ts

import { AuthSessionStatus, AuthProvider } from '@prisma/client';

import { AuthSessionService } from '../application/auth-session.service';
import {
  AuthRefreshDeniedError,
  InvalidCredentialsError,
} from '../domain/errors/auth.errors';

describe('AuthSessionService', () => {
  let service: AuthSessionService;

  const authRepository = {
    findSessionByRefreshTokenHash: jest.fn(),
    rotateSessionRefresh: jest.fn(),
    findSessionByIdAndUserId: jest.fn(),
    markSessionLoggedOut: jest.fn(),
    markAllActiveSessionsLoggedOutByUserId: jest.fn(),
    revokeAllActiveSessionsByUserId: jest.fn(),
    listAuthIdentitiesByUserId: jest.fn(),
  };

  const authSupportService = {
    hashToken: jest.fn((value: string) => `hashed:${value}`),
    recordAudit: jest.fn(),
  };

  const tokenIssuer = {
    issueAccessToken: jest.fn(),
    issueRefreshToken: jest.fn(),
  };

  const authEventsPort = {
    publish: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthSessionService(
      authRepository as any,
      authSupportService as any,
      tokenIssuer as any,
      authEventsPort as any,
    );
  });

  describe('refreshSession', () => {
    it('refreshes the session and rotates the refresh token', async () => {
      authRepository.findSessionByRefreshTokenHash.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        provider: AuthProvider.PASSWORD,
        status: AuthSessionStatus.ACTIVE,
        refreshTokenHash: 'hashed:old-refresh-token',
        refreshExpiresAt: new Date('2026-05-01T12:00:00.000Z'),
      });

      tokenIssuer.issueAccessToken.mockResolvedValue({
        token: 'new-access-token',
        expiresAt: new Date('2026-04-01T12:00:00.000Z'),
      });

      tokenIssuer.issueRefreshToken.mockResolvedValue({
        token: 'new-refresh-token',
        expiresAt: new Date('2026-05-15T12:00:00.000Z'),
      });

      authRepository.rotateSessionRefresh.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        provider: AuthProvider.PASSWORD,
        status: AuthSessionStatus.REFRESHED,
        expiresAt: new Date('2026-04-01T12:00:00.000Z'),
        refreshExpiresAt: new Date('2026-05-15T12:00:00.000Z'),
      });

      const result = await service.refreshSession({
        refreshToken: 'old-refresh-token',
      });

      expect(authRepository.findSessionByRefreshTokenHash).toHaveBeenCalledWith(
        'hashed:old-refresh-token',
      );

      expect(tokenIssuer.issueAccessToken).toHaveBeenCalledWith({
        userId: 'user-1',
        provider: AuthProvider.PASSWORD,
        sessionId: 'session-1',
      });

      expect(tokenIssuer.issueRefreshToken).toHaveBeenCalledWith({
        userId: 'user-1',
        provider: AuthProvider.PASSWORD,
        sessionId: 'session-1',
      });

      expect(authRepository.rotateSessionRefresh).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-1',
          expectedRefreshTokenHash: 'hashed:old-refresh-token',
          newAccessTokenHash: 'hashed:new-access-token',
          newRefreshTokenHash: 'hashed:new-refresh-token',
          expiresAt: new Date('2026-04-01T12:00:00.000Z'),
          refreshExpiresAt: new Date('2026-05-15T12:00:00.000Z'),
          refreshedAt: expect.any(Date),
        }),
      );

      expect(authSupportService.recordAudit).toHaveBeenCalledWith(
        'auth.session.refreshed',
        'user-1',
        'user-1',
        expect.objectContaining({
          sessionId: 'session-1',
          refreshedAt: expect.any(Date),
          rotatedRefreshToken: true,
        }),
      );

      expect(authEventsPort.publish).toHaveBeenCalledWith({
        eventName: 'auth_session_refreshed',
        payload: {
          sessionId: 'session-1',
          userId: 'user-1',
          refreshedAt: expect.any(Date),
          rotatedRefreshToken: true,
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          sessionId: 'session-1',
          userId: 'user-1',
          status: AuthSessionStatus.REFRESHED,
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        }),
      );

      expect(result.refreshToken).not.toBe('old-refresh-token');
    });

    it('throws AuthRefreshDeniedError when refresh token does not resolve to a session', async () => {
      authRepository.findSessionByRefreshTokenHash.mockResolvedValue(null);

      await expect(
        service.refreshSession({ refreshToken: 'missing-refresh-token' }),
      ).rejects.toBeInstanceOf(AuthRefreshDeniedError);

      expect(tokenIssuer.issueAccessToken).not.toHaveBeenCalled();
      expect(tokenIssuer.issueRefreshToken).not.toHaveBeenCalled();
      expect(authRepository.rotateSessionRefresh).not.toHaveBeenCalled();
      expect(authSupportService.recordAudit).not.toHaveBeenCalled();
      expect(authEventsPort.publish).not.toHaveBeenCalled();
    });

    it.each([
      AuthSessionStatus.ISSUED,
      AuthSessionStatus.REVOKED,
      AuthSessionStatus.EXPIRED,
      AuthSessionStatus.LOGGED_OUT,
    ])(
      'throws AuthRefreshDeniedError when session status is not refreshable: %s',
      async (status) => {
        authRepository.findSessionByRefreshTokenHash.mockResolvedValue({
          id: 'session-1',
          userId: 'user-1',
          provider: AuthProvider.PASSWORD,
          status,
          refreshTokenHash: 'hashed:old-refresh-token',
          refreshExpiresAt: new Date('2026-05-01T12:00:00.000Z'),
        });

        await expect(
          service.refreshSession({ refreshToken: 'old-refresh-token' }),
        ).rejects.toBeInstanceOf(AuthRefreshDeniedError);

        expect(tokenIssuer.issueAccessToken).not.toHaveBeenCalled();
        expect(tokenIssuer.issueRefreshToken).not.toHaveBeenCalled();
        expect(authRepository.rotateSessionRefresh).not.toHaveBeenCalled();
      },
    );

    it('throws AuthRefreshDeniedError when refresh credential is expired', async () => {
      authRepository.findSessionByRefreshTokenHash.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        provider: AuthProvider.PASSWORD,
        status: AuthSessionStatus.ACTIVE,
        refreshTokenHash: 'hashed:old-refresh-token',
        refreshExpiresAt: new Date('2020-01-01T00:00:00.000Z'),
      });

      await expect(
        service.refreshSession({ refreshToken: 'old-refresh-token' }),
      ).rejects.toBeInstanceOf(AuthRefreshDeniedError);

      expect(tokenIssuer.issueAccessToken).not.toHaveBeenCalled();
      expect(tokenIssuer.issueRefreshToken).not.toHaveBeenCalled();
      expect(authRepository.rotateSessionRefresh).not.toHaveBeenCalled();
    });

    it('throws AuthRefreshDeniedError when refresh token rotation cannot be completed', async () => {
      authRepository.findSessionByRefreshTokenHash.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        provider: AuthProvider.PASSWORD,
        status: AuthSessionStatus.ACTIVE,
        refreshTokenHash: 'hashed:old-refresh-token',
        refreshExpiresAt: new Date('2026-05-01T12:00:00.000Z'),
      });

      tokenIssuer.issueAccessToken.mockResolvedValue({
        token: 'new-access-token',
        expiresAt: new Date('2026-04-01T12:00:00.000Z'),
      });

      tokenIssuer.issueRefreshToken.mockResolvedValue(undefined);

      await expect(
        service.refreshSession({ refreshToken: 'old-refresh-token' }),
      ).rejects.toBeInstanceOf(AuthRefreshDeniedError);

      expect(authRepository.rotateSessionRefresh).not.toHaveBeenCalled();
      expect(authSupportService.recordAudit).not.toHaveBeenCalled();
      expect(authEventsPort.publish).not.toHaveBeenCalled();
    });

    it('rejects replay of the same refresh token after rotation', async () => {
      authRepository.findSessionByRefreshTokenHash.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        provider: AuthProvider.PASSWORD,
        status: AuthSessionStatus.ACTIVE,
        refreshTokenHash: 'hashed:old-refresh-token',
        refreshExpiresAt: new Date('2026-05-01T12:00:00.000Z'),
      });

      tokenIssuer.issueAccessToken.mockResolvedValue({
        token: 'new-access-token',
        expiresAt: new Date('2026-04-01T12:00:00.000Z'),
      });

      tokenIssuer.issueRefreshToken.mockResolvedValue({
        token: 'new-refresh-token',
        expiresAt: new Date('2026-05-15T12:00:00.000Z'),
      });

      authRepository.rotateSessionRefresh.mockResolvedValue(null);

      await expect(
        service.refreshSession({ refreshToken: 'old-refresh-token' }),
      ).rejects.toBeInstanceOf(AuthRefreshDeniedError);

      expect(authRepository.rotateSessionRefresh).toHaveBeenCalledTimes(1);

      expect(authSupportService.recordAudit).toHaveBeenCalledWith(
        'auth.session.refresh.failed',
        'user-1',
        'user-1',
        {
          sessionId: 'session-1',
          reason: 'refresh_token_replay_or_concurrent_update',
          operation: 'refresh_session',
          provider: AuthProvider.PASSWORD,
          refreshedAt: expect.any(Date),
        },
      );
    });
  });

  describe('logout', () => {
    it.each([
      AuthSessionStatus.ISSUED,
      AuthSessionStatus.ACTIVE,
      AuthSessionStatus.REFRESHED,
    ])(
      'marks session as LOGGED_OUT when status is %s',
      async (status) => {
        authRepository.findSessionByIdAndUserId.mockResolvedValue({
          id: 'session-1',
          userId: 'user-1',
          status,
        });

        authRepository.markSessionLoggedOut.mockResolvedValue({
          id: 'session-1',
          userId: 'user-1',
          status: AuthSessionStatus.LOGGED_OUT,
          loggedOutAt: new Date(),
        });

        await service.logout('user-1', { sessionId: 'session-1' });

        expect(authRepository.findSessionByIdAndUserId).toHaveBeenCalledWith(
          'session-1',
          'user-1',
        );
        expect(authRepository.markSessionLoggedOut).toHaveBeenCalledTimes(1);
        expect(authRepository.markSessionLoggedOut).toHaveBeenCalledWith(
          'session-1',
          expect.any(Date),
        );
      },
    );

    it.each([
      AuthSessionStatus.LOGGED_OUT,
      AuthSessionStatus.REVOKED,
      AuthSessionStatus.EXPIRED,
    ])(
      'does nothing when session is already terminal: %s',
      async (status) => {
        authRepository.findSessionByIdAndUserId.mockResolvedValue({
          id: 'session-1',
          userId: 'user-1',
          status,
        });

        await service.logout('user-1', { sessionId: 'session-1' });

        expect(authRepository.markSessionLoggedOut).not.toHaveBeenCalled();
        expect(authSupportService.recordAudit).not.toHaveBeenCalled();
        expect(authEventsPort.publish).not.toHaveBeenCalled();
      },
    );

    it('throws InvalidCredentialsError when session is not found', async () => {
      authRepository.findSessionByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.logout('user-1', { sessionId: 'missing-session' }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);

      expect(authRepository.markSessionLoggedOut).not.toHaveBeenCalled();
      expect(authSupportService.recordAudit).not.toHaveBeenCalled();
      expect(authEventsPort.publish).not.toHaveBeenCalled();
    });

    it('records audit with loggedOutAt metadata', async () => {
      authRepository.findSessionByIdAndUserId.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        status: AuthSessionStatus.ACTIVE,
      });

      authRepository.markSessionLoggedOut.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        status: AuthSessionStatus.LOGGED_OUT,
        loggedOutAt: new Date(),
      });

      await service.logout('user-1', { sessionId: 'session-1' });

      expect(authSupportService.recordAudit).toHaveBeenCalledTimes(1);
      expect(authSupportService.recordAudit).toHaveBeenCalledWith(
        'auth.logout.completed',
        'user-1',
        'user-1',
        {
          sessionId: 'session-1',
          loggedOutAt: expect.any(Date),
        },
      );
    });

    it('publishes event with loggedOutAt payload', async () => {
      authRepository.findSessionByIdAndUserId.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        status: AuthSessionStatus.ACTIVE,
      });

      authRepository.markSessionLoggedOut.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        status: AuthSessionStatus.LOGGED_OUT,
        loggedOutAt: new Date(),
      });

      await service.logout('user-1', { sessionId: 'session-1' });

      expect(authEventsPort.publish).toHaveBeenCalledTimes(1);
      expect(authEventsPort.publish).toHaveBeenCalledWith({
        eventName: 'auth_logout_completed',
        payload: {
          userId: 'user-1',
          sessionId: 'session-1',
          loggedOutAt: expect.any(Date),
        },
      });
    });

    it('returns early when dto.sessionId is missing', async () => {
      await service.logout('user-1', {});

      expect(authRepository.findSessionByIdAndUserId).not.toHaveBeenCalled();
      expect(authRepository.markSessionLoggedOut).not.toHaveBeenCalled();
      expect(authSupportService.recordAudit).not.toHaveBeenCalled();
      expect(authEventsPort.publish).not.toHaveBeenCalled();
    });
  });

  describe('logoutAllSessions', () => {
    it('calls markAllActiveSessionsLoggedOutByUserId', async () => {
      authRepository.markAllActiveSessionsLoggedOutByUserId.mockResolvedValue({
        count: 3,
      });

      await service.logoutAllSessions('user-1');

      expect(
        authRepository.markAllActiveSessionsLoggedOutByUserId,
      ).toHaveBeenCalledTimes(1);
      expect(
        authRepository.markAllActiveSessionsLoggedOutByUserId,
      ).toHaveBeenCalledWith('user-1', expect.any(Date));
    });

    it('records audit with loggedOutCount and loggedOutAt', async () => {
      authRepository.markAllActiveSessionsLoggedOutByUserId.mockResolvedValue({
        count: 3,
      });

      await service.logoutAllSessions('user-1');

      expect(authSupportService.recordAudit).toHaveBeenCalledTimes(1);
      expect(authSupportService.recordAudit).toHaveBeenCalledWith(
        'auth.logout_all.completed',
        'user-1',
        'user-1',
        {
          loggedOutCount: 3,
          loggedOutAt: expect.any(Date),
        },
      );
    });

    it('publishes event with loggedOutAt and loggedOutCount', async () => {
      authRepository.markAllActiveSessionsLoggedOutByUserId.mockResolvedValue({
        count: 3,
      });

      await service.logoutAllSessions('user-1');

      expect(authEventsPort.publish).toHaveBeenCalledTimes(1);
      expect(authEventsPort.publish).toHaveBeenCalledWith({
        eventName: 'auth_logout_all_completed',
        payload: {
          userId: 'user-1',
          loggedOutAt: expect.any(Date),
          loggedOutCount: 3,
        },
      });
    });

    it('does not use revocation semantics during logoutAllSessions', async () => {
      authRepository.markAllActiveSessionsLoggedOutByUserId.mockResolvedValue({
        count: 2,
      });

      await service.logoutAllSessions('user-1');

      expect(
        authRepository.markAllActiveSessionsLoggedOutByUserId,
      ).toHaveBeenCalledTimes(1);

      expect(
        authRepository.revokeAllActiveSessionsByUserId,
      ).not.toHaveBeenCalled();

      expect(authSupportService.recordAudit).toHaveBeenCalledWith(
        'auth.logout_all.completed',
        'user-1',
        'user-1',
        {
          loggedOutCount: 2,
          loggedOutAt: expect.any(Date),
        },
      );
    });
  });

  describe('getCurrentAuthContext', () => {
    it('returns current auth context when session exists for the actor', async () => {
      const actor = {
        userId: 'user-1',
        sessionId: 'session-1',
        authIdentityId: 'identity-1',
        provider: AuthProvider.PASSWORD,
      };

      authRepository.findSessionByIdAndUserId.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        status: AuthSessionStatus.ACTIVE,
      });

      authRepository.listAuthIdentitiesByUserId.mockResolvedValue([
        {
          id: 'identity-1',
          userId: 'user-1',
          provider: AuthProvider.PASSWORD,
          providerSubject: 'password-subject-1',
          email: 'marvin@example.com',
          phone: null,
          createdAt: new Date('2026-04-09T10:00:00.000Z'),
        },
        {
          id: 'identity-2',
          userId: 'user-1',
          provider: AuthProvider.GOOGLE,
          providerSubject: 'google-subject-1',
          email: 'marvin@example.com',
          phone: null,
          createdAt: new Date('2026-04-09T11:00:00.000Z'),
        },
      ]);

      const result = await service.getCurrentAuthContext(actor);

      expect(authRepository.findSessionByIdAndUserId).toHaveBeenCalledWith(
        'session-1',
        'user-1',
      );

      expect(authRepository.listAuthIdentitiesByUserId).toHaveBeenCalledWith(
        'user-1',
      );

      expect(result).toEqual({
        userId: 'user-1',
        sessionId: 'session-1',
        sessionStatus: AuthSessionStatus.ACTIVE,
        identities: [
          {
            id: 'identity-1',
            userId: 'user-1',
            provider: AuthProvider.PASSWORD,
            providerSubject: 'password-subject-1',
            email: 'marvin@example.com',
            phone: null,
            createdAt: new Date('2026-04-09T10:00:00.000Z'),
          },
          {
            id: 'identity-2',
            userId: 'user-1',
            provider: AuthProvider.GOOGLE,
            providerSubject: 'google-subject-1',
            email: 'marvin@example.com',
            phone: null,
            createdAt: new Date('2026-04-09T11:00:00.000Z'),
          },
        ],
      });
    });

    it('throws InvalidCredentialsError when session does not exist for the actor', async () => {
      const actor = {
        userId: 'user-1',
        sessionId: 'missing-session',
        authIdentityId: 'identity-1',
        provider: AuthProvider.PASSWORD,
      };

      authRepository.findSessionByIdAndUserId.mockResolvedValue(null);

      await expect(service.getCurrentAuthContext(actor)).rejects.toBeInstanceOf(
        InvalidCredentialsError,
      );

      expect(authRepository.listAuthIdentitiesByUserId).not.toHaveBeenCalled();
    });

    it('returns current auth context with empty identities when user has no linked identities', async () => {
      const actor = {
        userId: 'user-1',
        sessionId: 'session-1',
        authIdentityId: null,
        provider: AuthProvider.PASSWORD,
      };

      authRepository.findSessionByIdAndUserId.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        status: AuthSessionStatus.REFRESHED,
      });

      authRepository.listAuthIdentitiesByUserId.mockResolvedValue([]);

      const result = await service.getCurrentAuthContext(actor);

      expect(result).toEqual({
        userId: 'user-1',
        sessionId: 'session-1',
        sessionStatus: AuthSessionStatus.REFRESHED,
        identities: [],
      });
    });
  });
});