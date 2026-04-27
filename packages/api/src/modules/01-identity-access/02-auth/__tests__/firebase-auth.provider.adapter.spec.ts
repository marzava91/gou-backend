// packages/api/src/modules/01-identity-and-access/02-auth/__tests__/firebase-auth.provider.adapter.spec.ts

import { AuthProvider } from '@prisma/client';

import { FirebaseAuthProviderAdapter } from '../adapters/providers/firebase/firebase-auth.provider.adapter';
import { InvalidCredentialsError } from '../domain/errors/auth.errors';

describe('FirebaseAuthProviderAdapter', () => {
  let adapter: FirebaseAuthProviderAdapter;

  const firebaseAdminProvider = {
    verifyIdToken: jest.fn(),
    getUser: jest.fn(),
    updateUserPassword: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    adapter = new FirebaseAuthProviderAdapter(firebaseAdminProvider as any);
  });

  it('maps Firebase password sign-in into AuthProvider.PASSWORD', async () => {
    firebaseAdminProvider.verifyIdToken.mockResolvedValue({
      uid: 'firebase-uid-1',
      firebase: {
        sign_in_provider: 'password',
      },
    });

    firebaseAdminProvider.getUser.mockResolvedValue({
      uid: 'firebase-uid-1',
      email: 'marvin@example.com',
      emailVerified: true,
      phoneNumber: null,
    });

    const result = await adapter.authenticate({
      identifier: 'marvin@example.com',
      secret: 'firebase-id-token',
      provider: AuthProvider.PASSWORD,
    });

    expect(result).toEqual({
      provider: AuthProvider.PASSWORD,
      providerSubject: 'firebase-uid-1',
      userId: undefined,
      email: 'marvin@example.com',
      emailVerified: true,
      phone: null,
      phoneVerified: false,
    });
  });

  it('maps Firebase phone sign-in into AuthProvider.PHONE_CODE', async () => {
    firebaseAdminProvider.verifyIdToken.mockResolvedValue({
      uid: 'firebase-uid-2',
      firebase: {
        sign_in_provider: 'phone',
      },
    });

    firebaseAdminProvider.getUser.mockResolvedValue({
      uid: 'firebase-uid-2',
      email: null,
      emailVerified: false,
      phoneNumber: '+51987654321',
    });

    const result = await adapter.authenticate({
      identifier: '+51987654321',
      secret: 'firebase-id-token',
      provider: AuthProvider.PHONE_CODE,
    });

    expect(result).toEqual({
      provider: AuthProvider.PHONE_CODE,
      providerSubject: 'firebase-uid-2',
      userId: undefined,
      email: null,
      emailVerified: false,
      phone: '+51987654321',
      phoneVerified: true,
    });
  });

  it('maps Firebase google.com sign-in into AuthProvider.GOOGLE', async () => {
    firebaseAdminProvider.verifyIdToken.mockResolvedValue({
      uid: 'firebase-uid-3',
      firebase: {
        sign_in_provider: 'google.com',
      },
    });

    firebaseAdminProvider.getUser.mockResolvedValue({
      uid: 'firebase-uid-3',
      email: 'marvin@example.com',
      emailVerified: true,
      phoneNumber: null,
    });

    const result = await adapter.authenticate({
      identifier: 'marvin@example.com',
      secret: 'firebase-id-token',
      provider: AuthProvider.GOOGLE,
    });

    expect(result).toEqual({
      provider: AuthProvider.GOOGLE,
      providerSubject: 'firebase-uid-3',
      userId: undefined,
      email: 'marvin@example.com',
      emailVerified: true,
      phone: null,
      phoneVerified: false,
    });
  });

  it('maps Firebase apple.com sign-in into AuthProvider.APPLE', async () => {
    firebaseAdminProvider.verifyIdToken.mockResolvedValue({
      uid: 'firebase-uid-4',
      firebase: {
        sign_in_provider: 'apple.com',
      },
    });

    firebaseAdminProvider.getUser.mockResolvedValue({
      uid: 'firebase-uid-4',
      email: 'marvin@example.com',
      emailVerified: true,
      phoneNumber: null,
    });

    const result = await adapter.authenticate({
      identifier: 'marvin@example.com',
      secret: 'firebase-id-token',
      provider: AuthProvider.APPLE,
    });

    expect(result).toEqual({
      provider: AuthProvider.APPLE,
      providerSubject: 'firebase-uid-4',
      userId: undefined,
      email: 'marvin@example.com',
      emailVerified: true,
      phone: null,
      phoneVerified: false,
    });
  });

  it('throws InvalidCredentialsError when token is missing', async () => {
    await expect(
      adapter.authenticate({
        identifier: 'marvin@example.com',
        secret: '',
        provider: AuthProvider.GOOGLE,
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(firebaseAdminProvider.verifyIdToken).not.toHaveBeenCalled();
  });

  it('throws InvalidCredentialsError when resolved provider does not match requested provider', async () => {
    firebaseAdminProvider.verifyIdToken.mockResolvedValue({
      uid: 'firebase-uid-5',
      firebase: {
        sign_in_provider: 'google.com',
      },
    });

    firebaseAdminProvider.getUser.mockResolvedValue({
      uid: 'firebase-uid-5',
      email: 'marvin@example.com',
      emailVerified: true,
      phoneNumber: null,
    });

    await expect(
      adapter.authenticate({
        identifier: 'marvin@example.com',
        secret: 'firebase-id-token',
        provider: AuthProvider.APPLE,
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('verifyExternalToken returns normalized provider result for linking flows', async () => {
    firebaseAdminProvider.verifyIdToken.mockResolvedValue({
      uid: 'firebase-uid-6',
      firebase: {
        sign_in_provider: 'google.com',
      },
    });

    firebaseAdminProvider.getUser.mockResolvedValue({
      uid: 'firebase-uid-6',
      email: 'marvin@example.com',
      emailVerified: true,
      phoneNumber: null,
    });

    const result = await adapter.verifyExternalToken!({
      provider: AuthProvider.GOOGLE,
      token: 'firebase-id-token',
    });

    expect(result).toEqual({
      provider: AuthProvider.GOOGLE,
      providerSubject: 'firebase-uid-6',
      userId: undefined,
      email: 'marvin@example.com',
      emailVerified: true,
      phone: null,
      phoneVerified: false,
    });
  });

  it('resetPassword updates Firebase password only for PASSWORD provider', async () => {
    firebaseAdminProvider.updateUserPassword.mockResolvedValue({
      uid: 'firebase-uid-7',
    });

    await expect(
      adapter.resetPassword!({
        provider: AuthProvider.PASSWORD,
        providerSubject: 'firebase-uid-7',
        newPassword: 'NewStrongPassword123!',
      }),
    ).resolves.toBeUndefined();

    expect(firebaseAdminProvider.updateUserPassword).toHaveBeenCalledWith(
      'firebase-uid-7',
      'NewStrongPassword123!',
    );
  });
});
