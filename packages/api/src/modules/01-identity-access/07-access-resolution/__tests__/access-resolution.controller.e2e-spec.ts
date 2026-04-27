// packages/api/src/modules/01-identity-and-access/07-access-resolution/__tests__/access-resolution.controller.e2e-spec.ts

import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  MembershipScopeType,
  OperationalSurface,
  AuthSessionStatus,
} from '@prisma/client';

import { AccessResolutionController } from '../access-resolution.controller';
import { AccessResolutionFacadeService } from '../access-resolution.service';
import { AccessDecisionMapper } from '../mappers/access-decision.mapper';
import { AccessResolutionAuthenticatedGuard } from '../guards/access-resolution-authenticated.guard';
import { AccessContextMapper } from '../mappers/access-context.mapper';
import { EffectivePermissionMapper } from '../mappers/effective-permission.mapper';

class AllowGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}

class DenyGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return false;
  }
}

describe('AccessResolutionController (e2e)', () => {
  let app: INestApplication;

  const facadeMock = {
    evaluateAccess: jest.fn(),
    resolveAccessContext: jest.fn(),
    listEffectivePermissions: jest.fn(),
  };

  async function buildApp(options?: {
    authenticatedGuard?: CanActivate;
    injectActor?: boolean;
    useRealGuard?: boolean;
  }) {
    const builder = Test.createTestingModule({
      controllers: [AccessResolutionController],
      providers: [
        AccessDecisionMapper,
        AccessContextMapper,
        EffectivePermissionMapper,
        AccessResolutionAuthenticatedGuard,
        {
          provide: AccessResolutionFacadeService,
          useValue: facadeMock,
        },
      ],
    });

    if (!options?.useRealGuard) {
      builder
        .overrideGuard(AccessResolutionAuthenticatedGuard)
        .useValue(options?.authenticatedGuard ?? new AllowGuard());
    }

    const moduleRef = await builder.compile();
    const testApp = moduleRef.createNestApplication();

    testApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );

    if (options?.injectActor !== false) {
      testApp.use((req: any, _res: any, next: () => void) => {
        req.user = {
          userId: 'user_1',
          sessionId: 'session_1',
          authIdentityId: 'identity_1',
          provider: 'PASSWORD',
        };
        next();
      });
    }

    await testApp.init();
    return testApp;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    facadeMock.evaluateAccess.mockResolvedValue({
      allowed: true,
      reasonCode: 'access_allowed',
      surface: OperationalSurface.PARTNERS_WEB,
      capabilityKey: 'orders.read',
      resourceKey: 'orders',
      actionKey: 'read',
      membership: {
        membershipId: 'membership_1',
        userId: 'user_1',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: 'ACTIVE',
      },
      evaluatedAt: new Date('2026-04-18T11:00:00.000Z'),
      explanation: {
        baselineMatchedCapability: true,
        matchedAllowGrantIds: [],
        matchedDenyGrantIds: [],
      },
    });

    facadeMock.resolveAccessContext.mockResolvedValue({
      session: {
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.ACTIVE,
      },
      activeContext: {
        userId: 'user_1',
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: 'ACTIVE',
        updatedAt: new Date('2026-04-18T10:55:00.000Z'),
      },
      membership: {
        membershipId: 'membership_1',
        userId: 'user_1',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: 'ACTIVE',
      },
      effectiveCapabilityKeys: ['catalog.publish', 'orders.read'],
      evaluatedAt: new Date('2026-04-18T11:00:00.000Z'),
    });

    facadeMock.listEffectivePermissions.mockResolvedValue({
      surface: OperationalSurface.PARTNERS_WEB,
      membership: {
        membershipId: 'membership_1',
        userId: 'user_1',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: 'ACTIVE',
      },
      capabilityKeys: ['catalog.publish', 'orders.read'],
      evaluatedAt: new Date('2026-04-18T12:00:00.000Z'),
    });

    app = await buildApp();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /v1/access-resolution/evaluate returns mapped access decision', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/access-resolution/evaluate')
      .query({
        surface: OperationalSurface.PARTNERS_WEB,
        capabilityKey: 'orders.read',
      })
      .expect(200);

    expect(response.body).toEqual({
      allowed: true,
      reasonCode: 'access_allowed',
      surface: OperationalSurface.PARTNERS_WEB,
      capabilityKey: 'orders.read',
      resourceKey: 'orders',
      actionKey: 'read',
      membership: {
        membershipId: 'membership_1',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
      },
      explanation: {
        baselineMatchedCapability: true,
        matchedAllowGrantIds: [],
        matchedDenyGrantIds: [],
      },
      evaluatedAt: '2026-04-18T11:00:00.000Z',
    });

    expect(facadeMock.evaluateAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        sessionId: 'session_1',
      }),
      expect.objectContaining({
        surface: OperationalSurface.PARTNERS_WEB,
        capabilityKey: 'orders.read',
      }),
    );
  });

  it('returns 400 when surface is invalid', async () => {
    await request(app.getHttpServer())
      .get('/v1/access-resolution/evaluate')
      .query({
        surface: 'INVALID_SURFACE',
        capabilityKey: 'orders.read',
      })
      .expect(400);

    expect(facadeMock.evaluateAccess).not.toHaveBeenCalled();
  });

  it('returns 403 when authenticated guard denies request', async () => {
    await app.close();
    app = await buildApp({
      authenticatedGuard: new DenyGuard(),
    });

    await request(app.getHttpServer())
      .get('/v1/access-resolution/evaluate')
      .query({
        surface: OperationalSurface.PARTNERS_WEB,
        capabilityKey: 'orders.read',
      })
      .expect(403);
  });

  it('GET /v1/access-resolution/context returns mapped access context', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/access-resolution/context')
      .query({
        surface: OperationalSurface.PARTNERS_WEB,
      })
      .expect(200);

    expect(response.body).toEqual({
      session: {
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.ACTIVE,
      },
      activeContext: {
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: 'ACTIVE',
        updatedAt: '2026-04-18T10:55:00.000Z',
      },
      membership: {
        membershipId: 'membership_1',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: 'ACTIVE',
      },
      effectiveCapabilityKeys: ['catalog.publish', 'orders.read'],
      evaluatedAt: '2026-04-18T11:00:00.000Z',
    });

    expect(facadeMock.resolveAccessContext).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        sessionId: 'session_1',
      }),
      expect.objectContaining({
        surface: OperationalSurface.PARTNERS_WEB,
      }),
    );
  });

  it('GET /v1/access-resolution/context returns 400 when surface is invalid', async () => {
    await request(app.getHttpServer())
      .get('/v1/access-resolution/context')
      .query({
        surface: 'INVALID_SURFACE',
      })
      .expect(400);

    expect(facadeMock.resolveAccessContext).not.toHaveBeenCalled();
  });

  it('GET /v1/access-resolution/context returns 403 when authenticated guard denies request', async () => {
    await app.close();
    app = await buildApp({
      authenticatedGuard: new DenyGuard(),
    });

    await request(app.getHttpServer())
      .get('/v1/access-resolution/context')
      .query({
        surface: OperationalSurface.PARTNERS_WEB,
      })
      .expect(403);
  });

  it('GET /v1/access-resolution/context returns 401 when actor is missing', async () => {
    await app.close();
    app = await buildApp({
      useRealGuard: true,
      injectActor: false,
    });

    await request(app.getHttpServer())
      .get('/v1/access-resolution/context')
      .query({
        surface: OperationalSurface.PARTNERS_WEB,
      })
      .expect(401);
  });

  it('GET /v1/access-resolution/effective-permissions returns mapped effective permissions', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/access-resolution/effective-permissions')
      .query({
        surface: OperationalSurface.PARTNERS_WEB,
      })
      .expect(200);

    expect(response.body).toEqual({
      surface: OperationalSurface.PARTNERS_WEB,
      membership: {
        membershipId: 'membership_1',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
      },
      capabilityKeys: ['catalog.publish', 'orders.read'],
      evaluatedAt: '2026-04-18T12:00:00.000Z',
    });

    expect(facadeMock.listEffectivePermissions).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        sessionId: 'session_1',
      }),
      expect.objectContaining({
        surface: OperationalSurface.PARTNERS_WEB,
      }),
    );
  });

  it('GET /v1/access-resolution/effective-permissions returns 400 when surface is invalid', async () => {
    await request(app.getHttpServer())
      .get('/v1/access-resolution/effective-permissions')
      .query({
        surface: 'INVALID_SURFACE',
      })
      .expect(400);

    expect(facadeMock.listEffectivePermissions).not.toHaveBeenCalled();
  });

  it('GET /v1/access-resolution/effective-permissions returns 403 when authenticated guard denies request', async () => {
    await app.close();
    app = await buildApp({
      authenticatedGuard: new DenyGuard(),
    });

    await request(app.getHttpServer())
      .get('/v1/access-resolution/effective-permissions')
      .query({
        surface: OperationalSurface.PARTNERS_WEB,
      })
      .expect(403);
  });

  it('GET /v1/access-resolution/effective-permissions returns 401 when actor is missing', async () => {
    await app.close();
    app = await buildApp({
      useRealGuard: true,
      injectActor: false,
    });

    await request(app.getHttpServer())
      .get('/v1/access-resolution/effective-permissions')
      .query({
        surface: OperationalSurface.PARTNERS_WEB,
      })
      .expect(401);
  });
});