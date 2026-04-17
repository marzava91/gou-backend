// packages\api\src\modules\01-identity-and-access\02-auth\__tests__\auth-login.service.spec.ts

import {
  Prisma,
  AuthProvider,
  AuthSessionStatus,
  UserStatus,
} from '@prisma/client';

import { AuthLoginService } from '../application/auth-login.service';
import {
  AuthProviderNotLinkedError,
  UserNotAuthenticableError,
} from '../domain/errors/auth.errors';

describe('AuthLoginService', () => {
  let service: AuthLoginService;

  const authRepository = {
    findAuthIdentityByProvider: jest.fn(),
    findAuthIdentityByUserIdAndProvider: jest.fn(),
    findCandidateUserIdsByVerifiedEmail: jest.fn(),
    findCandidateUserIdsByVerifiedPhone: jest.fn(),
    createAuthIdentity: jest.fn(),
    findUserAuthProfileById: jest.fn(),
    createAuthSession: jest.fn(),
  };

  const authSupportService = {
    hashToken: jest.fn((value: string) => `hashed:${value}`),
    recordAudit: jest.fn(),
  };

  const authProvider = {
    authenticate: jest.fn(),
  };

  const tokenIssuer = {
    issueAccessToken: jest.fn(),
    issueRefreshToken: jest.fn(),
  };

  const authEventsPort = {
    publish: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();

    service = new AuthLoginService(
      authRepository as any,
      authSupportService as any,
      authProvider as any,
      tokenIssuer as any,
      authEventsPort as any,
    );
  });

  it('logs in successfully when resolved user is ACTIVE', async () => {
    authProvider.authenticate.mockResolvedValue({
      provider: AuthProvider.PASSWORD,
      providerSubject: 'subject-1',
    });

    authRepository.findAuthIdentityByProvider.mockResolvedValue({
      id: 'identity-1',
      userId: 'user-1',
      provider: AuthProvider.PASSWORD,
      providerSubject: 'subject-1',
    });

    authRepository.findUserAuthProfileById.mockResolvedValue({
      id: 'user-1',
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: false,
    });

    tokenIssuer.issueAccessToken.mockResolvedValue({
      token: 'access-token',
      expiresAt: new Date('2026-04-01T12:00:00.000Z'),
    });

    tokenIssuer.issueRefreshToken.mockResolvedValue({
      token: 'refresh-token',
      expiresAt: new Date('2026-05-01T12:00:00.000Z'),
    });

    authRepository.createAuthSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      provider: AuthProvider.PASSWORD,
      status: AuthSessionStatus.ISSUED,
      expiresAt: new Date('2026-04-01T12:00:00.000Z'),
      refreshExpiresAt: new Date('2026-05-01T12:00:00.000Z'),
    });

    const result = await service.login({
      identifier: 'marvin@example.com',
      secret: 'super-secret',
      provider: AuthProvider.PASSWORD,
      deviceName: 'Chrome on Windows',
    });

    expect(authRepository.findUserAuthProfileById).toHaveBeenCalledWith(
      'user-1',
    );
    expect(tokenIssuer.issueAccessToken).toHaveBeenCalledTimes(1);
    expect(authRepository.createAuthSession).toHaveBeenCalledTimes(1);
    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      'auth.login.succeeded',
      'user-1',
      'user-1',
      expect.objectContaining({
        sessionId: 'session-1',
        provider: AuthProvider.PASSWORD,
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        sessionId: 'session-1',
        userId: 'user-1',
        provider: AuthProvider.PASSWORD,
        status: AuthSessionStatus.ISSUED,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
    );
  });

  it.each([
    UserStatus.SUSPENDED,
    UserStatus.DEACTIVATED,
    UserStatus.ANONYMIZED,
  ])(
    'throws UserNotAuthenticableError when user status is %s',
    async (status) => {
      authProvider.authenticate.mockResolvedValue({
        provider: AuthProvider.PASSWORD,
        providerSubject: 'subject-1',
      });

      authRepository.findAuthIdentityByProvider.mockResolvedValue({
        id: 'identity-1',
        userId: 'user-1',
        provider: AuthProvider.PASSWORD,
        providerSubject: 'subject-1',
      });

      authRepository.findUserAuthProfileById.mockResolvedValue({
        id: 'user-1',
        status,
        emailVerified: true,
        phoneVerified: false,
      });

      await expect(
        service.login({
          identifier: 'marvin@example.com',
          secret: 'super-secret',
          provider: AuthProvider.PASSWORD,
        }),
      ).rejects.toBeInstanceOf(UserNotAuthenticableError);

      expect(tokenIssuer.issueAccessToken).not.toHaveBeenCalled();
      expect(tokenIssuer.issueRefreshToken).not.toHaveBeenCalled();
      expect(authRepository.createAuthSession).not.toHaveBeenCalled();

      expect(authSupportService.recordAudit).toHaveBeenCalledWith(
        'auth.login.failed',
        null,
        'user-1',
        {
          reason: 'user_not_authenticable',
          provider: AuthProvider.PASSWORD,
          userStatus: status,
        },
      );

      expect(authEventsPort.publish).not.toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'auth_session_issued',
        }),
      );
    },
  );

  it('throws UserNotAuthenticableError when resolved user does not exist', async () => {
    authProvider.authenticate.mockResolvedValue({
      provider: AuthProvider.PASSWORD,
      providerSubject: 'subject-1',
    });

    authRepository.findAuthIdentityByProvider.mockResolvedValue({
      id: 'identity-1',
      userId: 'user-404',
      provider: AuthProvider.PASSWORD,
      providerSubject: 'subject-1',
    });

    authRepository.findUserAuthProfileById.mockResolvedValue(null);

    await expect(
      service.login({
        identifier: 'marvin@example.com',
        secret: 'super-secret',
        provider: AuthProvider.PASSWORD,
      }),
    ).rejects.toBeInstanceOf(UserNotAuthenticableError);

    expect(tokenIssuer.issueAccessToken).not.toHaveBeenCalled();
    expect(authRepository.createAuthSession).not.toHaveBeenCalled();

    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      'auth.login.failed',
      null,
      'user-404',
      {
        reason: 'user_not_authenticable',
        provider: AuthProvider.PASSWORD,
        userStatus: null,
      },
    );
  });

  it('throws AuthProviderNotLinkedError when provider identity cannot be resolved', async () => {
    authProvider.authenticate.mockResolvedValue({
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
      email: 'marvin@example.com',
      emailVerified: false,
      phone: null,
      phoneVerified: false,
    });

    authRepository.findAuthIdentityByProvider.mockResolvedValue(null);
    authRepository.findCandidateUserIdsByVerifiedEmail.mockResolvedValue([]);
    authRepository.findCandidateUserIdsByVerifiedPhone.mockResolvedValue([]);

    await expect(
      service.login({
        identifier: 'marvin@example.com',
        provider: AuthProvider.GOOGLE,
        externalToken: 'google-token-1',
      }),
    ).rejects.toBeInstanceOf(AuthProviderNotLinkedError);

    expect(authRepository.findUserAuthProfileById).not.toHaveBeenCalled();
    expect(tokenIssuer.issueAccessToken).not.toHaveBeenCalled();
    expect(authRepository.createAuthSession).not.toHaveBeenCalled();

    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      'auth.login.failed',
      null,
      null,
      {
        reason: 'identity_not_linked',
        provider: AuthProvider.GOOGLE,
      },
    );
  });

  it('auto-links GOOGLE login to the existing user when verified email matches canonical User.primaryEmail', async () => {
    authProvider.authenticate.mockResolvedValue({
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
      email: 'marvin@example.com',
      emailVerified: true,
      phone: null,
      phoneVerified: false,
    });

    authRepository.findAuthIdentityByProvider.mockResolvedValue(null);
    authRepository.findAuthIdentityByUserIdAndProvider.mockResolvedValue(null);
    authRepository.findCandidateUserIdsByVerifiedEmail.mockResolvedValue([
      'user-1',
    ]);
    authRepository.findUserAuthProfileById.mockResolvedValue({
      id: 'user-1',
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: false,
    });

    authRepository.createAuthIdentity.mockResolvedValue({
      id: 'identity-google-1',
      userId: 'user-1',
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
    });

    tokenIssuer.issueAccessToken.mockResolvedValue({
      token: 'access-token',
      expiresAt: new Date('2026-04-01T12:00:00.000Z'),
    });

    tokenIssuer.issueRefreshToken.mockResolvedValue({
      token: 'refresh-token',
      expiresAt: new Date('2026-05-01T12:00:00.000Z'),
    });

    authRepository.createAuthSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      provider: AuthProvider.GOOGLE,
      status: AuthSessionStatus.ISSUED,
      expiresAt: new Date('2026-04-01T12:00:00.000Z'),
      refreshExpiresAt: new Date('2026-05-01T12:00:00.000Z'),
    });

    const result = await service.login({
      identifier: 'marvin@example.com',
      provider: AuthProvider.GOOGLE,
      externalToken: 'google-token-1',
    });

    expect(
      authRepository.findCandidateUserIdsByVerifiedEmail,
    ).toHaveBeenCalledWith('marvin@example.com');
    expect(
      authRepository.findAuthIdentityByUserIdAndProvider,
    ).toHaveBeenCalledWith('user-1', AuthProvider.GOOGLE);
    expect(authRepository.createAuthIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        provider: AuthProvider.GOOGLE,
        providerSubject: 'google-subject-1',
        email: 'marvin@example.com',
        emailVerified: true,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        provider: AuthProvider.GOOGLE,
      }),
    );
    expect(authProvider.authenticate).toHaveBeenCalledWith({
      identifier: 'marvin@example.com',
      provider: AuthProvider.GOOGLE,
      externalToken: 'google-token-1',
    });
  });

  it('rejects federated auto-link when verified signals resolve to multiple users', async () => {
    authProvider.authenticate.mockResolvedValue({
      provider: AuthProvider.APPLE,
      providerSubject: 'apple-subject-1',
      email: 'marvin@example.com',
      emailVerified: true,
      phone: null,
      phoneVerified: false,
    });

    authRepository.findAuthIdentityByProvider.mockResolvedValue(null);
    authRepository.findCandidateUserIdsByVerifiedEmail.mockResolvedValue([
      'user-1',
      'user-2',
    ]);

    await expect(
      service.login({
        identifier: 'marvin@example.com',
        provider: AuthProvider.APPLE,
        externalToken: 'apple-token-1',
      }),
    ).rejects.toBeInstanceOf(AuthProviderNotLinkedError);

    expect(
      authRepository.findAuthIdentityByUserIdAndProvider,
    ).not.toHaveBeenCalled();
    expect(authRepository.createAuthIdentity).not.toHaveBeenCalled();
    expect(tokenIssuer.issueAccessToken).not.toHaveBeenCalled();
    expect(authRepository.createAuthSession).not.toHaveBeenCalled();

    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      'auth.login.failed',
      null,
      null,
      {
        reason: 'account_resolution_conflict',
        provider: AuthProvider.APPLE,
        candidateUserIdsCount: 2,
        emailMatched: true,
        phoneMatched: false,
      },
    );
  });

  it('does not auto-link PASSWORD login even if a verified email candidate exists', async () => {
    authProvider.authenticate.mockResolvedValue({
      provider: AuthProvider.PASSWORD,
      providerSubject: 'password-subject-1',
      email: 'marvin@example.com',
      emailVerified: true,
      phone: null,
      phoneVerified: false,
    });

    authRepository.findAuthIdentityByProvider.mockResolvedValue(null);
    authRepository.findCandidateUserIdsByVerifiedEmail.mockResolvedValue([
      'user-1',
    ]);
    authRepository.findCandidateUserIdsByVerifiedPhone.mockResolvedValue([]);

    await expect(
      service.login({
        identifier: 'marvin@example.com',
        secret: 'super-secret',
        provider: AuthProvider.PASSWORD,
      }),
    ).rejects.toBeInstanceOf(AuthProviderNotLinkedError);

    expect(
      authRepository.findCandidateUserIdsByVerifiedEmail,
    ).not.toHaveBeenCalled();
    expect(
      authRepository.findCandidateUserIdsByVerifiedPhone,
    ).not.toHaveBeenCalled();
    expect(authRepository.createAuthIdentity).not.toHaveBeenCalled();
    expect(tokenIssuer.issueAccessToken).not.toHaveBeenCalled();
    expect(authRepository.createAuthSession).not.toHaveBeenCalled();

    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      'auth.login.failed',
      null,
      null,
      {
        reason: 'identity_not_linked',
        provider: AuthProvider.PASSWORD,
      },
    );
  });

  it('auto-links APPLE login to the existing user when verified phone matches canonical User.primaryPhone', async () => {
    authProvider.authenticate.mockResolvedValue({
      provider: AuthProvider.APPLE,
      providerSubject: 'apple-subject-1',
      email: null,
      emailVerified: false,
      phone: '+51987654321',
      phoneVerified: true,
    });

    authRepository.findAuthIdentityByProvider.mockResolvedValue(null);
    authRepository.findAuthIdentityByUserIdAndProvider.mockResolvedValue(null);
    authRepository.findCandidateUserIdsByVerifiedEmail.mockResolvedValue([]);
    authRepository.findCandidateUserIdsByVerifiedPhone.mockResolvedValue([
      'user-1',
    ]);

    authRepository.findUserAuthProfileById.mockResolvedValue({
      id: 'user-1',
      status: UserStatus.ACTIVE,
      emailVerified: false,
      phoneVerified: true,
    });

    authRepository.createAuthIdentity.mockResolvedValue({
      id: 'identity-apple-1',
      userId: 'user-1',
      provider: AuthProvider.APPLE,
      providerSubject: 'apple-subject-1',
    });

    tokenIssuer.issueAccessToken.mockResolvedValue({
      token: 'access-token',
      expiresAt: new Date('2026-04-01T12:00:00.000Z'),
    });

    tokenIssuer.issueRefreshToken.mockResolvedValue({
      token: 'refresh-token',
      expiresAt: new Date('2026-05-01T12:00:00.000Z'),
    });

    authRepository.createAuthSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      provider: AuthProvider.APPLE,
      status: AuthSessionStatus.ISSUED,
      expiresAt: new Date('2026-04-01T12:00:00.000Z'),
      refreshExpiresAt: new Date('2026-05-01T12:00:00.000Z'),
    });

    const result = await service.login({
      identifier: '+51987654321',
      provider: AuthProvider.APPLE,
      externalToken: 'apple-token-1',
    });

    expect(
      authRepository.findCandidateUserIdsByVerifiedEmail,
    ).not.toHaveBeenCalled();
    expect(
      authRepository.findCandidateUserIdsByVerifiedPhone,
    ).toHaveBeenCalledWith('+51987654321');

    expect(
      authRepository.findAuthIdentityByUserIdAndProvider,
    ).toHaveBeenCalledWith('user-1', AuthProvider.APPLE);

    expect(authRepository.createAuthIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        provider: AuthProvider.APPLE,
        providerSubject: 'apple-subject-1',
        phone: '+51987654321',
        phoneVerified: true,
      }),
    );

    expect(authProvider.authenticate).toHaveBeenCalledWith({
      identifier: '+51987654321',
      provider: AuthProvider.APPLE,
      externalToken: 'apple-token-1',
    });

    expect(result).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        provider: AuthProvider.APPLE,
      }),
    );
  });

  it('rejects federated auto-link when verified email and verified phone resolve to different users', async () => {
    authProvider.authenticate.mockResolvedValue({
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
      email: 'marvin@example.com',
      emailVerified: true,
      phone: '+51987654321',
      phoneVerified: true,
    });

    authRepository.findAuthIdentityByProvider.mockResolvedValue(null);
    authRepository.findCandidateUserIdsByVerifiedEmail.mockResolvedValue([
      'user-1',
    ]);
    authRepository.findCandidateUserIdsByVerifiedPhone.mockResolvedValue([
      'user-2',
    ]);

    await expect(
      service.login({
        identifier: 'marvin@example.com',
        provider: AuthProvider.GOOGLE,
        externalToken: 'google-token-1',
      }),
    ).rejects.toBeInstanceOf(AuthProviderNotLinkedError);

    expect(
      authRepository.findCandidateUserIdsByVerifiedEmail,
    ).toHaveBeenCalledWith('marvin@example.com');
    expect(
      authRepository.findCandidateUserIdsByVerifiedPhone,
    ).toHaveBeenCalledWith('+51987654321');

    expect(
      authRepository.findAuthIdentityByUserIdAndProvider,
    ).not.toHaveBeenCalled();
    expect(authRepository.createAuthIdentity).not.toHaveBeenCalled();
    expect(tokenIssuer.issueAccessToken).not.toHaveBeenCalled();
    expect(authRepository.createAuthSession).not.toHaveBeenCalled();

    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      'auth.login.failed',
      null,
      null,
      {
        reason: 'account_resolution_conflict',
        provider: AuthProvider.GOOGLE,
        candidateUserIdsCount: 2,
        emailMatched: true,
        phoneMatched: true,
      },
    );
  });

  it('continues login when auto-link createAuthIdentity hits P2002 and concurrent global identity belongs to same user', async () => {
    authProvider.authenticate.mockResolvedValue({
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
      email: 'marvin@example.com',
      emailVerified: true,
      phone: null,
      phoneVerified: false,
    });

    authRepository.findAuthIdentityByProvider
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'identity-google-1',
        userId: 'user-1',
        provider: AuthProvider.GOOGLE,
        providerSubject: 'google-subject-1',
      });

    authRepository.findAuthIdentityByUserIdAndProvider.mockResolvedValue(null);
    authRepository.findCandidateUserIdsByVerifiedEmail.mockResolvedValue([
      'user-1',
    ]);

    authRepository.createAuthIdentity.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    authRepository.findUserAuthProfileById.mockResolvedValue({
      id: 'user-1',
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: false,
    });

    tokenIssuer.issueAccessToken.mockResolvedValue({
      token: 'access-token',
      expiresAt: new Date('2026-04-01T12:00:00.000Z'),
    });

    tokenIssuer.issueRefreshToken.mockResolvedValue({
      token: 'refresh-token',
      expiresAt: new Date('2026-05-01T12:00:00.000Z'),
    });

    authRepository.createAuthSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      provider: AuthProvider.GOOGLE,
      status: AuthSessionStatus.ISSUED,
      expiresAt: new Date('2026-04-01T12:00:00.000Z'),
      refreshExpiresAt: new Date('2026-05-01T12:00:00.000Z'),
    });

    const result = await service.login({
      identifier: 'marvin@example.com',
      provider: AuthProvider.GOOGLE,
      externalToken: 'google-token-1',
    });

    expect(result).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        provider: AuthProvider.GOOGLE,
        sessionId: 'session-1',
      }),
    );

    expect(authRepository.createAuthSession).toHaveBeenCalledTimes(1);
  });

  it('continues login when auto-link createAuthIdentity hits P2002 and concurrent provider identity is found by user-provider lookup', async () => {
    authProvider.authenticate.mockResolvedValue({
      provider: AuthProvider.APPLE,
      providerSubject: 'apple-subject-1',
      email: null,
      emailVerified: false,
      phone: '+51987654321',
      phoneVerified: true,
    });

    authRepository.findAuthIdentityByProvider
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    authRepository.findCandidateUserIdsByVerifiedPhone.mockResolvedValue([
      'user-1',
    ]);

    authRepository.findAuthIdentityByUserIdAndProvider
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'identity-apple-1',
        userId: 'user-1',
        provider: AuthProvider.APPLE,
        providerSubject: 'apple-subject-1',
      });

    authRepository.createAuthIdentity.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    authRepository.findUserAuthProfileById.mockResolvedValue({
      id: 'user-1',
      status: UserStatus.ACTIVE,
      emailVerified: false,
      phoneVerified: true,
    });

    tokenIssuer.issueAccessToken.mockResolvedValue({
      token: 'access-token',
      expiresAt: new Date('2026-04-01T12:00:00.000Z'),
    });

    tokenIssuer.issueRefreshToken.mockResolvedValue({
      token: 'refresh-token',
      expiresAt: new Date('2026-05-01T12:00:00.000Z'),
    });

    authRepository.createAuthSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      provider: AuthProvider.APPLE,
      status: AuthSessionStatus.ISSUED,
      expiresAt: new Date('2026-04-01T12:00:00.000Z'),
      refreshExpiresAt: new Date('2026-05-01T12:00:00.000Z'),
    });

    const result = await service.login({
      identifier: '+51987654321',
      provider: AuthProvider.APPLE,
      externalToken: 'apple-token-1',
    });

    expect(result).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        provider: AuthProvider.APPLE,
        sessionId: 'session-1',
      }),
    );

    expect(authRepository.createAuthSession).toHaveBeenCalledTimes(1);
  });

  it('fails federated login when external token is missing', async () => {
    await expect(
      service.login({
        identifier: 'marvin@example.com',
        provider: AuthProvider.GOOGLE,
      }),
    ).rejects.toBeInstanceOf(AuthProviderNotLinkedError);

    expect(authProvider.authenticate).not.toHaveBeenCalled();

    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      'auth.login.failed',
      null,
      null,
      {
        reason: 'missing_external_token',
        provider: AuthProvider.GOOGLE,
      },
    );
  });
});
