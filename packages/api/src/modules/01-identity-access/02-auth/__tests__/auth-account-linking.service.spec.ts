// packages/api/src/modules/01-identity-and-access/02-auth/__tests__/auth-account-linking.service.spec.ts

import { Prisma, AuthProvider } from '@prisma/client';

import { AuthAccountLinkingService } from '../application/support/auth-account-linking.service';
import { AuthProviderNotLinkedError } from '../domain/errors/auth.errors';
import { AUTH_AUDIT_ACTIONS } from '../domain/constants/auth.constants';
import { AuthDomainEvents } from '../domain/events/auth.events';

describe('AuthAccountLinkingService', () => {
  let service: AuthAccountLinkingService;

  const authRepository = {
    findAuthIdentityByProvider: jest.fn(),
    findCandidateUserIdsByVerifiedEmail: jest.fn(),
    findCandidateUserIdsByVerifiedPhone: jest.fn(),
    findAuthIdentityByUserIdAndProvider: jest.fn(),
    createAuthIdentity: jest.fn(),
  };

  const authSupportService = {
    recordAudit: jest.fn(),
  };

  const authEventsPort = {
    publish: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthAccountLinkingService(
      authRepository as any,
      authSupportService as any,
      authEventsPort as any,
    );
  });

  it('returns existing linked identity when providerSubject is already linked', async () => {
    authRepository.findAuthIdentityByProvider.mockResolvedValue({
      id: 'identity-1',
      userId: 'user-1',
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
    });

    const result = await service.resolveOrAutoLinkIdentity({
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
      email: 'marvin@example.com',
      emailVerified: true,
    });

    expect(result).toEqual({
      resolvedUserId: 'user-1',
      authIdentity: {
        id: 'identity-1',
        userId: 'user-1',
        provider: AuthProvider.GOOGLE,
        providerSubject: 'google-subject-1',
      },
      autoLinked: false,
    });

    expect(authRepository.createAuthIdentity).not.toHaveBeenCalled();
  });

  it('auto-links GOOGLE when verified email resolves to a single canonical user', async () => {
    authRepository.findAuthIdentityByProvider.mockResolvedValue(null);
    authRepository.findCandidateUserIdsByVerifiedEmail.mockResolvedValue([
      'user-1',
    ]);
    authRepository.findCandidateUserIdsByVerifiedPhone.mockResolvedValue([]);
    authRepository.findAuthIdentityByUserIdAndProvider.mockResolvedValue(null);
    authRepository.createAuthIdentity.mockResolvedValue({
      id: 'identity-google-1',
      userId: 'user-1',
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
      email: 'marvin@example.com',
      emailVerified: true,
      phone: null,
      phoneVerified: false,
    });

    const result = await service.resolveOrAutoLinkIdentity({
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-1',
      email: 'marvin@example.com',
      emailVerified: true,
      phone: null,
      phoneVerified: false,
    });

    expect(
      authRepository.findCandidateUserIdsByVerifiedEmail,
    ).toHaveBeenCalledWith('marvin@example.com');

    expect(authRepository.createAuthIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        provider: AuthProvider.GOOGLE,
        providerSubject: 'google-subject-1',
        email: 'marvin@example.com',
        emailVerified: true,
      }),
    );

    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      AUTH_AUDIT_ACTIONS.PROVIDER_LINKED,
      'user-1',
      'user-1',
      expect.objectContaining({
        authIdentityId: 'identity-google-1',
        provider: AuthProvider.GOOGLE,
        providerSubject: 'google-subject-1',
        linkingStrategy: 'verified_email',
      }),
    );

    expect(authEventsPort.publish).toHaveBeenCalledWith({
      eventName: AuthDomainEvents.PROVIDER_LINKED,
      payload: expect.objectContaining({
        userId: 'user-1',
        authIdentityId: 'identity-google-1',
        provider: AuthProvider.GOOGLE,
        linkingStrategy: 'verified_email',
      }),
    });

    expect(result).toEqual({
      resolvedUserId: 'user-1',
      authIdentity: expect.objectContaining({
        id: 'identity-google-1',
        userId: 'user-1',
      }),
      autoLinked: true,
    });
  });

  it('auto-links APPLE when verified phone resolves to a single canonical user', async () => {
    authRepository.findAuthIdentityByProvider.mockResolvedValue(null);
    authRepository.findCandidateUserIdsByVerifiedEmail.mockResolvedValue([]);
    authRepository.findCandidateUserIdsByVerifiedPhone.mockResolvedValue([
      'user-1',
    ]);
    authRepository.findAuthIdentityByUserIdAndProvider.mockResolvedValue(null);
    authRepository.createAuthIdentity.mockResolvedValue({
      id: 'identity-apple-1',
      userId: 'user-1',
      provider: AuthProvider.APPLE,
      providerSubject: 'apple-subject-1',
      email: null,
      emailVerified: false,
      phone: '+51987654321',
      phoneVerified: true,
    });

    const result = await service.resolveOrAutoLinkIdentity({
      provider: AuthProvider.APPLE,
      providerSubject: 'apple-subject-1',
      email: null,
      emailVerified: false,
      phone: '+51987654321',
      phoneVerified: true,
    });

    expect(
      authRepository.findCandidateUserIdsByVerifiedPhone,
    ).toHaveBeenCalledWith('+51987654321');

    expect(result).toEqual({
      resolvedUserId: 'user-1',
      authIdentity: expect.objectContaining({
        id: 'identity-apple-1',
        userId: 'user-1',
      }),
      autoLinked: true,
    });
  });

  it('rejects auto-link when provider is not allowed for auto-linking', async () => {
    authRepository.findAuthIdentityByProvider.mockResolvedValue(null);

    await expect(
      service.resolveOrAutoLinkIdentity({
        provider: AuthProvider.PASSWORD,
        providerSubject: 'firebase-uid-password',
        email: 'marvin@example.com',
        emailVerified: true,
      }),
    ).rejects.toBeInstanceOf(AuthProviderNotLinkedError);

    expect(
      authRepository.findCandidateUserIdsByVerifiedEmail,
    ).not.toHaveBeenCalled();
    expect(authRepository.createAuthIdentity).not.toHaveBeenCalled();
  });

  it('rejects federated auto-link when verified signals resolve to multiple users', async () => {
    authRepository.findAuthIdentityByProvider.mockResolvedValue(null);
    authRepository.findCandidateUserIdsByVerifiedEmail.mockResolvedValue([
      'user-1',
      'user-2',
    ]);
    authRepository.findCandidateUserIdsByVerifiedPhone.mockResolvedValue([]);

    await expect(
      service.resolveOrAutoLinkIdentity({
        provider: AuthProvider.GOOGLE,
        providerSubject: 'google-subject-2',
        email: 'marvin@example.com',
        emailVerified: true,
      }),
    ).rejects.toBeInstanceOf(AuthProviderNotLinkedError);

    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      AUTH_AUDIT_ACTIONS.LOGIN_FAILED,
      null,
      null,
      {
        reason: 'account_resolution_conflict',
        provider: AuthProvider.GOOGLE,
        candidateUserIdsCount: 2,
        emailMatched: true,
        phoneMatched: false,
      },
    );
  });

  it('rejects federated auto-link when verified email and phone resolve to different users', async () => {
    authRepository.findAuthIdentityByProvider.mockResolvedValue(null);
    authRepository.findCandidateUserIdsByVerifiedEmail.mockResolvedValue([
      'user-1',
    ]);
    authRepository.findCandidateUserIdsByVerifiedPhone.mockResolvedValue([
      'user-2',
    ]);

    await expect(
      service.resolveOrAutoLinkIdentity({
        provider: AuthProvider.GOOGLE,
        providerSubject: 'google-subject-3',
        email: 'marvin@example.com',
        emailVerified: true,
        phone: '+51987654321',
        phoneVerified: true,
      }),
    ).rejects.toBeInstanceOf(AuthProviderNotLinkedError);

    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      AUTH_AUDIT_ACTIONS.LOGIN_FAILED,
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

  it('continues with existing global identity when createAuthIdentity hits P2002 and concurrent identity belongs to same user', async () => {
    authRepository.findAuthIdentityByProvider
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'identity-google-2',
        userId: 'user-1',
        provider: AuthProvider.GOOGLE,
        providerSubject: 'google-subject-4',
      });

    authRepository.findCandidateUserIdsByVerifiedEmail.mockResolvedValue([
      'user-1',
    ]);
    authRepository.findCandidateUserIdsByVerifiedPhone.mockResolvedValue([]);
    authRepository.findAuthIdentityByUserIdAndProvider.mockResolvedValue(null);

    authRepository.createAuthIdentity.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await service.resolveOrAutoLinkIdentity({
      provider: AuthProvider.GOOGLE,
      providerSubject: 'google-subject-4',
      email: 'marvin@example.com',
      emailVerified: true,
    });

    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      AUTH_AUDIT_ACTIONS.PROVIDER_LINKED,
      'user-1',
      'user-1',
      {
        authIdentityId: 'identity-google-2',
        provider: AuthProvider.GOOGLE,
        providerSubject: 'google-subject-4',
        outcome: 'already_linked_after_concurrency',
        operation: 'auto_link_identity',
        concurrencyDetected: true,
      },
    );

    expect(result).toEqual({
      resolvedUserId: 'user-1',
      authIdentity: {
        id: 'identity-google-2',
        userId: 'user-1',
        provider: AuthProvider.GOOGLE,
        providerSubject: 'google-subject-4',
      },
      autoLinked: false,
    });
  });

  it('continues with existing user-provider identity when createAuthIdentity hits P2002 and concurrent provider identity is found by user-provider lookup', async () => {
    authRepository.findAuthIdentityByProvider
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    authRepository.findCandidateUserIdsByVerifiedPhone.mockResolvedValue([
      'user-1',
    ]);
    authRepository.findCandidateUserIdsByVerifiedEmail.mockResolvedValue([]);

    authRepository.findAuthIdentityByUserIdAndProvider
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'identity-apple-2',
        userId: 'user-1',
        provider: AuthProvider.APPLE,
        providerSubject: 'apple-subject-2',
      });

    authRepository.createAuthIdentity.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await service.resolveOrAutoLinkIdentity({
      provider: AuthProvider.APPLE,
      providerSubject: 'apple-subject-2',
      phone: '+51987654321',
      phoneVerified: true,
    });

    expect(authSupportService.recordAudit).toHaveBeenCalledWith(
      AUTH_AUDIT_ACTIONS.PROVIDER_LINKED,
      'user-1',
      'user-1',
      {
        authIdentityId: 'identity-apple-2',
        provider: AuthProvider.APPLE,
        providerSubject: 'apple-subject-2',
        outcome: 'already_linked_after_concurrency',
        operation: 'auto_link_identity',
        concurrencyDetected: true,
      },
    );

    expect(result).toEqual({
      resolvedUserId: 'user-1',
      authIdentity: {
        id: 'identity-apple-2',
        userId: 'user-1',
        provider: AuthProvider.APPLE,
        providerSubject: 'apple-subject-2',
      },
      autoLinked: false,
    });
  });
});
