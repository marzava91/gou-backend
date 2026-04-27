// packages/api/src/integrations/__tests__/identity-access/auth.service.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import {
  AuthProvider,
  AuthSessionStatus,
  UserStatus,
} from '@prisma/client';

import { PrismaModule } from '../../../prisma/prisma.module';
import { PrismaService } from '../../../prisma/prisma.service';

import { AuthService } from '../../../modules/01-identity-access/02-auth/auth.service';
import { AuthRepository } from '../../../modules/01-identity-access/02-auth/auth.repository';

import { AuthSupportService } from '../../../modules/01-identity-access/02-auth/application/support/auth-support.service';
import { AuthLoginService } from '../../../modules/01-identity-access/02-auth/application/auth-login.service';
import { AuthSessionService } from '../../../modules/01-identity-access/02-auth/application/auth-session.service';
import { AuthVerificationService } from '../../../modules/01-identity-access/02-auth/application/auth-verification.service';
import { AuthIdentityService } from '../../../modules/01-identity-access/02-auth/application/auth-identity.service';
import { AuthPasswordResetService } from '../../../modules/01-identity-access/02-auth/application/auth-password-reset.service';

import { AUTH_PROVIDER_PORT } from '../../../modules/01-identity-access/02-auth/ports/auth-provider.port';
import { AUTH_TOKEN_ISSUER_PORT } from '../../../modules/01-identity-access/02-auth/ports/auth-token-issuer.port';
import { AUTH_AUDIT_PORT } from '../../../modules/01-identity-access/02-auth/ports/auth-audit.port';
import { AUTH_EVENTS_PORT } from '../../../modules/01-identity-access/02-auth/ports/auth-events.port';
import { AUTH_VERIFICATION_PORT } from '../../../modules/01-identity-access/02-auth/ports/auth-verification.port';

import { AuthProviderNotLinkedError } from '../../../modules/01-identity-access/02-auth/domain/errors/auth.errors';

import { cleanIdentityAccessTestData } from '../../setup/test-db-cleaner';

jest.setTimeout(30000);

describe('AuthService Integration (REAL DB)', () => {
  let moduleRef: TestingModule;
  let authService: AuthService;
  let prisma: PrismaService;

  const authProvider = {
    authenticate: jest.fn(),
    verifyExternalToken: jest.fn(),
    resetPassword: jest.fn(),
  };

  const tokenIssuer = {
    issueAccessToken: jest.fn(),
    issueRefreshToken: jest.fn(),
  };

  const authAuditPort = {
    record: jest.fn(),
  };

  const authEventsPort = {
    publish: jest.fn(),
  };

  const authVerificationPort = {
    sendCode: jest.fn(),
    verifyCode: jest.fn(),
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [
        AuthService,
        AuthRepository,
        AuthSupportService,
        AuthLoginService,
        AuthSessionService,
        AuthVerificationService,
        AuthIdentityService,
        AuthPasswordResetService,
        {
          provide: AUTH_PROVIDER_PORT,
          useValue: authProvider,
        },
        {
          provide: AUTH_TOKEN_ISSUER_PORT,
          useValue: tokenIssuer,
        },
        {
          provide: AUTH_AUDIT_PORT,
          useValue: authAuditPort,
        },
        {
          provide: AUTH_EVENTS_PORT,
          useValue: authEventsPort,
        },
        {
          provide: AUTH_VERIFICATION_PORT,
          useValue: authVerificationPort,
        },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
    prisma = moduleRef.get(PrismaService);

    await prisma.$connect();
    await cleanIdentityAccessTestData(prisma);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    authProvider.authenticate.mockResolvedValue({
      provider: AuthProvider.PASSWORD,
      providerSubject: 'integration-test-password-subject',
      email: 'integration-test-auth-service@example.com',
      emailVerified: true,
      phone: null,
      phoneVerified: false,
    });

    tokenIssuer.issueAccessToken.mockResolvedValue({
      token: 'integration-test-access-token',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });

    tokenIssuer.issueRefreshToken.mockResolvedValue({
      token: 'integration-test-refresh-token',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });
  });

  afterAll(async () => {
    await cleanIdentityAccessTestData(prisma);
    await prisma.$disconnect();
    await moduleRef.close();
  });

  it('logs in through AuthService and persists an auth session', async () => {
    const user = await prisma.user.create({
      data: {
        primaryEmail: 'integration-test-auth-service@example.com',
        emailVerified: true,
        status: UserStatus.ACTIVE,
      },
    });

    const identity = await prisma.authIdentity.create({
      data: {
        userId: user.id,
        provider: AuthProvider.PASSWORD,
        providerSubject: 'integration-test-password-subject',
        email: 'integration-test-auth-service@example.com',
        emailVerified: true,
      },
    });

    const result = await authService.login({
      provider: AuthProvider.PASSWORD,
      identifier: 'integration-test-auth-service@example.com',
      secret: 'valid-password',
      deviceName: 'integration-test-device',
    } as any);

    expect(result.sessionId).toBeDefined();
    expect(result.userId).toBe(user.id);
    expect(result.provider).toBe(AuthProvider.PASSWORD);
    expect(result.accessToken).toBe('integration-test-access-token');
    expect(result.refreshToken).toBe('integration-test-refresh-token');

    const persistedSession = await prisma.authSession.findUnique({
      where: { id: result.sessionId },
    });

    expect(persistedSession).not.toBeNull();
    expect(persistedSession?.userId).toBe(user.id);
    expect(persistedSession?.authIdentityId).toBe(identity.id);
    expect(persistedSession?.provider).toBe(AuthProvider.PASSWORD);
    expect(persistedSession?.status).toBe(AuthSessionStatus.ISSUED);
    expect(persistedSession?.deviceName).toBe('integration-test-device');
  });

  it('rejects login when provider identity is not linked', async () => {
    authProvider.authenticate.mockResolvedValue({
      provider: AuthProvider.PASSWORD,
      providerSubject: 'integration-test-missing-subject',
      email: 'integration-test-missing@example.com',
      emailVerified: true,
    });

    await expect(
        authService.login({
            provider: AuthProvider.PASSWORD,
            identifier: 'integration-test-missing@example.com',
            secret: 'valid-password',
        } as any),
    ).rejects.toBeInstanceOf(AuthProviderNotLinkedError);
  });

  it('logs out an existing session through AuthService and persists LOGGED_OUT status', async () => {
    const user = await prisma.user.create({
      data: {
        primaryEmail: `integration-test-logout-${Date.now()}@example.com`,
        emailVerified: true,
        status: UserStatus.ACTIVE,
      },
    });

    const identity = await prisma.authIdentity.create({
      data: {
        userId: user.id,
        provider: AuthProvider.PASSWORD,
        providerSubject: `integration-test-logout-subject-${Date.now()}`,
        emailVerified: true,
      },
    });

    const session = await prisma.authSession.create({
      data: {
        userId: user.id,
        authIdentityId: identity.id,
        provider: AuthProvider.PASSWORD,
        status: AuthSessionStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        refreshExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        deviceName: 'integration-test-device',
      },
    });

    await authService.logout(user.id, {
      sessionId: session.id,
    });

    const persistedSession = await prisma.authSession.findUnique({
      where: { id: session.id },
    });

    expect(persistedSession).not.toBeNull();
    expect(persistedSession?.status).toBe(AuthSessionStatus.LOGGED_OUT);
    expect(persistedSession?.loggedOutAt).toBeInstanceOf(Date);
  });
});