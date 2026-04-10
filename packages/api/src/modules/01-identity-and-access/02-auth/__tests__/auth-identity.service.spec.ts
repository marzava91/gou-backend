import { Prisma, AuthProvider } from '@prisma/client';

import { AuthIdentityService } from '../application/auth-identity.service';
import {
  AuthProviderAlreadyLinkedError,
  AuthProviderNotLinkedError,
  AuthProviderUnlinkDeniedError,
  InvalidCredentialsError,
} from '../domain/errors/auth.errors';

import { AUTH_AUDIT_ACTIONS } from '../domain/constants/auth.constants';
import { AuthDomainEvents } from '../domain/events/auth.events';

describe('AuthIdentityService', () => {
  let service: AuthIdentityService;

  const authRepository = {
    findAuthIdentityByProvider: jest.fn(),
    findAuthIdentityByUserIdAndProvider: jest.fn(),
    createAuthIdentity: jest.fn(),
    countAuthIdentitiesByUserId: jest.fn(),
    deleteAuthIdentity: jest.fn(),
  };

  const authSupportService = {
    recordAudit: jest.fn(),
  };

  const authProvider = {
    verifyExternalToken: jest.fn(),
  };

  const authEventsPort = {
    publish: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();

    service = new AuthIdentityService(
      authRepository as any,
      authSupportService as any,
      authProvider as any,
      authEventsPort as any,
    );
  });

  it('returns alreadyLinked when global identity already exists for same user', async () => {
    authProvider.verifyExternalToken.mockResolvedValue({
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
    });

    authRepository.findAuthIdentityByProvider.mockResolvedValue({
      id: 'identity-1',
      userId: 'user-1',
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
    });

    const result = await service.linkIdentity('user-1', {
      provider: AuthProvider.GOOGLE,
      externalToken: 'google-token-1',
    });

    expect(result.linked).toBe(true);
    expect(result.alreadyLinked).toBe(true);
    expect(authRepository.createAuthIdentity).not.toHaveBeenCalled();
    expect(authSupportService.recordAudit).toHaveBeenCalled();
  });

  it('throws AuthProviderAlreadyLinkedError when global identity already exists for another user', async () => {
    authProvider.verifyExternalToken.mockResolvedValue({
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
    });

    authRepository.findAuthIdentityByProvider.mockResolvedValue({
      id: 'identity-2',
      userId: 'user-2',
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
    });

    await expect(
      service.linkIdentity('user-1', {
        provider: AuthProvider.GOOGLE,
        externalToken: 'google-token-1',
      }),
    ).rejects.toBeInstanceOf(AuthProviderAlreadyLinkedError);

    expect(authRepository.createAuthIdentity).not.toHaveBeenCalled();
  });

  it('throws AuthProviderAlreadyLinkedError when provider already exists for the same user', async () => {
    authProvider.verifyExternalToken.mockResolvedValue({
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-new',
      email: 'marvin@example.com',
      emailVerified: true,
      phone: null,
      phoneVerified: false,
    });

    authRepository.findAuthIdentityByProvider.mockResolvedValue(null);
    authRepository.findAuthIdentityByUserIdAndProvider.mockResolvedValue({
      id: 'identity-3',
      userId: 'user-1',
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-old',
    });

    await expect(
      service.linkIdentity('user-1', {
        provider: AuthProvider.GOOGLE,
        externalToken: 'google-token-1',
      }),
    ).rejects.toBeInstanceOf(AuthProviderAlreadyLinkedError);

    expect(authRepository.createAuthIdentity).not.toHaveBeenCalled();
  });

  it('returns alreadyLinked when createAuthIdentity hits P2002 and concurrent global identity belongs to same user', async () => {
    authProvider.verifyExternalToken.mockResolvedValue({
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
    });

    authRepository.findAuthIdentityByProvider
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'identity-1',
        userId: 'user-1',
        provider: AuthProvider.GOOGLE,
        providerSubject: 'google-subject-1',
      });

    authRepository.findAuthIdentityByUserIdAndProvider.mockResolvedValue(null);

    authRepository.createAuthIdentity.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await service.linkIdentity('user-1', {
      provider: AuthProvider.GOOGLE,
      externalToken: 'google-token-1',
    });

    expect(result.linked).toBe(true);
    expect(result.alreadyLinked).toBe(true);

    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      AUTH_AUDIT_ACTIONS.PROVIDER_LINKED,
      'user-1',
      'user-1',
      {
        authIdentityId: 'identity-1',
        provider: AuthProvider.GOOGLE,
        providerSubject: 'google-subject-1',
        outcome: 'already_linked_after_concurrency',
        operation: 'link_identity',
        concurrencyDetected: true,
      },
    );
  });

  it('returns alreadyLinked when createAuthIdentity hits P2002 and concurrent user-provider identity is found', async () => {
    authProvider.verifyExternalToken.mockResolvedValue({
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
    });

    authRepository.findAuthIdentityByProvider
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    authRepository.findAuthIdentityByUserIdAndProvider
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'identity-4',
        userId: 'user-1',
        provider: AuthProvider.GOOGLE,
        providerSubject: 'google-subject-1',
      });

    authRepository.createAuthIdentity.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await service.linkIdentity('user-1', {
      provider: AuthProvider.GOOGLE,
      externalToken: 'google-token-1',
    });

    expect(result.linked).toBe(true);
    expect(result.alreadyLinked).toBe(true);

    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      AUTH_AUDIT_ACTIONS.PROVIDER_LINKED,
      'user-1',
      'user-1',
      {
        authIdentityId: 'identity-4',
        provider: AuthProvider.GOOGLE,
        providerSubject: 'google-subject-1',
        outcome: 'already_linked_after_concurrency',
        operation: 'link_identity',
        concurrencyDetected: true,
      },
    );
  });

  it('throws AuthProviderAlreadyLinkedError when createAuthIdentity hits P2002 and concurrent identity belongs to another user', async () => {
    authProvider.verifyExternalToken.mockResolvedValue({
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
    });

    authRepository.findAuthIdentityByProvider
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'identity-2',
        userId: 'user-2',
        provider: AuthProvider.GOOGLE,
        providerSubject: 'google-subject-1',
      });

    authRepository.findAuthIdentityByUserIdAndProvider.mockResolvedValue(null);

    authRepository.createAuthIdentity.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.linkIdentity('user-1', {
        provider: AuthProvider.GOOGLE,
        externalToken: 'google-token-1',
      }),
    ).rejects.toBeInstanceOf(AuthProviderAlreadyLinkedError);
  });

  it('throws InvalidCredentialsError when neither providerSubject nor externalToken is provided', async () => {
    await expect(
      service.linkIdentity('user-1', {
        provider: AuthProvider.GOOGLE,
      } as any),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(authRepository.findAuthIdentityByProvider).not.toHaveBeenCalled();
    expect(authRepository.createAuthIdentity).not.toHaveBeenCalled();
    expect(authProvider.verifyExternalToken).not.toHaveBeenCalled();
  });

  it('unlinks identity when provider is linked and user still has another auth method', async () => {
    authRepository.findAuthIdentityByUserIdAndProvider.mockResolvedValue({
      id: 'identity-1',
      userId: 'user-1',
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
    });

    authRepository.countAuthIdentitiesByUserId.mockResolvedValue(2);
    authRepository.deleteAuthIdentity.mockResolvedValue(undefined);

    const result = await service.unlinkIdentity('user-1', {
      provider: AuthProvider.GOOGLE,
    });

    expect(authRepository.deleteAuthIdentity).toHaveBeenCalledWith('identity-1');

    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      AUTH_AUDIT_ACTIONS.PROVIDER_UNLINKED,
      'user-1',
      'user-1',
      {
        authIdentityId: 'identity-1',
        provider: AuthProvider.GOOGLE,
        providerSubject: 'google-subject-1',
      },
    );

    expect(authEventsPort.publish).toHaveBeenCalledWith({
      eventName: AuthDomainEvents.PROVIDER_UNLINKED,
      payload: {
        userId: 'user-1',
        authIdentityId: 'identity-1',
        provider: AuthProvider.GOOGLE,
      },
    });

    expect(result).toEqual({
      unlinked: true,
    });
  });

  it('throws AuthProviderNotLinkedError when provider is not linked to the user', async () => {
    authRepository.findAuthIdentityByUserIdAndProvider.mockResolvedValue(null);

    await expect(
      service.unlinkIdentity('user-1', {
        provider: AuthProvider.GOOGLE,
      }),
    ).rejects.toBeInstanceOf(AuthProviderNotLinkedError);

    expect(authRepository.countAuthIdentitiesByUserId).not.toHaveBeenCalled();
    expect(authRepository.deleteAuthIdentity).not.toHaveBeenCalled();
  });

  it('throws AuthProviderUnlinkDeniedError when unlink would leave the user without any auth method', async () => {
    authRepository.findAuthIdentityByUserIdAndProvider.mockResolvedValue({
      id: 'identity-1',
      userId: 'user-1',
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
    });

    authRepository.countAuthIdentitiesByUserId.mockResolvedValue(1);

    await expect(
      service.unlinkIdentity('user-1', {
        provider: AuthProvider.GOOGLE,
      }),
    ).rejects.toBeInstanceOf(AuthProviderUnlinkDeniedError);

    expect(authRepository.deleteAuthIdentity).not.toHaveBeenCalled();
  });

  it('throws AuthProviderUnlinkDeniedError when identities count is zero or invalid for unlink', async () => {
    authRepository.findAuthIdentityByUserIdAndProvider.mockResolvedValue({
      id: 'identity-1',
      userId: 'user-1',
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
    });

    authRepository.countAuthIdentitiesByUserId.mockResolvedValue(0);

    await expect(
      service.unlinkIdentity('user-1', {
        provider: AuthProvider.GOOGLE,
      }),
    ).rejects.toBeInstanceOf(AuthProviderUnlinkDeniedError);

    expect(authRepository.deleteAuthIdentity).not.toHaveBeenCalled();
  });
});