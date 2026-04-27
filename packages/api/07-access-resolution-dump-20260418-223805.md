# 07-access-resolution code dump

> Generated: 2026-04-18 22:38:05
> Root: C:\Users\Workstation\workspace\miji-projects\backend-core-platform-api\packages\api\src\modules\01-identity-and-access\07-access-resolution
> Files found: 46

---
## __tests__/access-capability-normalization.rule.spec.ts
```ts
import {
  buildCapabilityKeyFromResourceAction,
  normalizeActionKey,
  normalizeCapabilityKey,
  normalizeResourceKey,
} from '../domain/rules/access-capability-normalization.rule';

describe('access capability normalization rules', () => {
  it('normalizes capability key', () => {
    expect(normalizeCapabilityKey(' Orders.Read ')).toBe('orders.read');
  });

  it('normalizes resource and action keys', () => {
    expect(normalizeResourceKey(' Orders ')).toBe('orders');
    expect(normalizeActionKey(' Write ')).toBe('write');
  });

  it('builds derived capability from resource and action', () => {
    expect(
      buildCapabilityKeyFromResourceAction({
        resourceKey: 'orders',
        actionKey: 'write',
      }),
    ).toBe('orders.write');
  });
});
```

---
## __tests__/access-context.mapper.spec.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/__tests__/access-context.mapper.spec.ts

import {
  AuthSessionStatus,
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
} from '@prisma/client';

import { AccessContextMapper } from '../mappers/access-context.mapper';

describe('AccessContextMapper', () => {
  let mapper: AccessContextMapper;

  beforeEach(() => {
    mapper = new AccessContextMapper();
  });

  it('maps resolved access context to response dto', () => {
    const evaluatedAt = new Date('2026-04-18T12:00:00.000Z');
    const updatedAt = new Date('2026-04-18T11:30:00.000Z');

    const result = mapper.toResponse({
      session: {
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.ACTIVE,
      },
      activeContext: {
        userId: 'user_1',
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
        updatedAt,
      },
      membership: {
        membershipId: 'membership_1',
        userId: 'user_1',
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
      },
      effectiveCapabilityKeys: ['catalog.publish', 'orders.read'],
      evaluatedAt,
    });

    expect(result).toEqual({
      session: {
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.ACTIVE,
      },
      activeContext: {
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
        updatedAt,
      },
      membership: {
        membershipId: 'membership_1',
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
      },
      effectiveCapabilityKeys: ['catalog.publish', 'orders.read'],
      evaluatedAt,
    });
  });

  it('maps activeContext and membership as null when they are not resolved', () => {
    const result = mapper.toResponse({
      session: {
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.REFRESHED,
      },
      activeContext: null,
      membership: null,
      effectiveCapabilityKeys: [],
      evaluatedAt: new Date('2026-04-18T12:00:00.000Z'),
    });

    expect(result.activeContext).toBeNull();
    expect(result.membership).toBeNull();
    expect(result.effectiveCapabilityKeys).toEqual([]);
  });
});
```

---
## __tests__/access-decision.mapper.spec.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/__tests__/access-decision.mapper.spec.ts

import { MembershipScopeType, OperationalSurface } from '@prisma/client';
import { AccessDecisionMapper } from '../mappers/access-decision.mapper';

describe('AccessDecisionMapper', () => {
  let mapper: AccessDecisionMapper;

  beforeEach(() => {
    mapper = new AccessDecisionMapper();
  });

  it('maps access decision to response dto', () => {
    const evaluatedAt = new Date('2026-04-18T10:00:00.000Z');

    const result = mapper.toResponse({
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
        status: 'ACTIVE' as any,
      },
      evaluatedAt,
      explanation: {
        baselineMatchedCapability: true,
        matchedAllowGrantIds: ['grant_allow_1'],
        matchedDenyGrantIds: [],
      },
    });

    expect(result).toEqual({
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
        matchedAllowGrantIds: ['grant_allow_1'],
        matchedDenyGrantIds: [],
      },
      evaluatedAt,
    });
  });

  it('maps membership as null when decision has no resolved membership', () => {
    const result = mapper.toResponse({
      allowed: false,
      reasonCode: 'access_denied',
      surface: OperationalSurface.PARTNERS_WEB,
      capabilityKey: 'orders.write',
      resourceKey: 'orders',
      actionKey: 'write',
      membership: null,
      evaluatedAt: new Date('2026-04-18T10:00:00.000Z'),
      explanation: {
        baselineMatchedCapability: false,
        matchedAllowGrantIds: [],
        matchedDenyGrantIds: [],
      },
    });

    expect(result.membership).toBeNull();
  });
});
```

---
## __tests__/access-grant-applicability.rule.spec.ts
```ts
import { GrantEffect, GrantStatus, GrantTargetType } from '@prisma/client';
import {
  grantMatchesRequestedTarget,
  isGrantCurrentlyApplicable,
} from '../domain/rules/access-grant-applicability.rule';

describe('access grant applicability rules', () => {
  const now = new Date('2026-04-17T10:00:00.000Z');

  it('accepts active grant inside validity window', () => {
    expect(
      isGrantCurrentlyApplicable(
        {
          id: 'grant_1',
          membershipId: 'membership_1',
          effect: GrantEffect.ALLOW,
          targetType: GrantTargetType.CAPABILITY,
          capabilityKey: 'orders.read',
          resourceKey: null,
          actionKey: null,
          status: GrantStatus.ACTIVE,
          validFrom: null,
          validUntil: null,
        },
        now,
      ),
    ).toBe(true);
  });

  it('rejects revoked grant', () => {
    expect(
      isGrantCurrentlyApplicable(
        {
          id: 'grant_1',
          membershipId: 'membership_1',
          effect: GrantEffect.ALLOW,
          targetType: GrantTargetType.CAPABILITY,
          capabilityKey: 'orders.read',
          resourceKey: null,
          actionKey: null,
          status: GrantStatus.REVOKED,
          validFrom: null,
          validUntil: null,
        },
        now,
      ),
    ).toBe(false);
  });

  it('matches capability grant to requested capability', () => {
    expect(
      grantMatchesRequestedTarget(
        {
          id: 'grant_1',
          membershipId: 'membership_1',
          effect: GrantEffect.ALLOW,
          targetType: GrantTargetType.CAPABILITY,
          capabilityKey: 'orders.read',
          resourceKey: null,
          actionKey: null,
          status: GrantStatus.ACTIVE,
          validFrom: null,
          validUntil: null,
        },
        {
          capabilityKey: 'orders.read',
          resourceKey: null,
          actionKey: null,
        },
      ),
    ).toBe(true);
  });

  it('rejects grant when validFrom is in the future', () => {
    expect(
        isGrantCurrentlyApplicable(
        {
            id: 'grant_2',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'orders.read',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: new Date('2026-04-18T10:00:01.000Z'),
            validUntil: null,
        },
        now,
        ),
    ).toBe(false);
  });

  it('rejects grant when validUntil is already past', () => {
    expect(
        isGrantCurrentlyApplicable(
        {
            id: 'grant_3',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'orders.read',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: new Date('2026-04-17T09:59:59.000Z'),
        },
        now,
        ),
    ).toBe(false);
  });

  it('matches resource_action grant to requested resource and action', () => {
    expect(
        grantMatchesRequestedTarget(
        {
            id: 'grant_ra_1',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.RESOURCE_ACTION,
            capabilityKey: null,
            resourceKey: 'orders',
            actionKey: 'write',
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
        },
        {
            capabilityKey: null,
            resourceKey: 'orders',
            actionKey: 'write',
        },
        ),
    ).toBe(true);
  });

  it('rejects resource_action grant when resource or action does not match', () => {
    expect(
        grantMatchesRequestedTarget(
        {
            id: 'grant_ra_2',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.RESOURCE_ACTION,
            capabilityKey: null,
            resourceKey: 'orders',
            actionKey: 'write',
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
        },
        {
            capabilityKey: null,
            resourceKey: 'orders',
            actionKey: 'delete',
        },
        ),
    ).toBe(false);
  });
});
```

---
## __tests__/access-reader-ports.contract.spec.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/__tests__/access-reader-ports.contract.spec.ts

import {
  AuthSessionStatus,
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
  RoleAssignmentStatus,
  RoleScopeType,
  GrantEffect,
  GrantStatus,
  GrantTargetType,
} from '@prisma/client';

import type { AccessAuthReaderPort } from '../ports/access-auth-reader.port';
import type { AccessMembershipReaderPort } from '../ports/access-membership-reader.port';
import type { AccessRoleReaderPort } from '../ports/access-role-reader.port';
import type { AccessGrantReaderPort } from '../ports/access-grant-reader.port';

describe('Access Reader Ports Contracts', () => {

  describe('AccessAuthReaderPort', () => {
    const port: AccessAuthReaderPort = {
      async findSessionByIdAndUserId() {
        return {
          sessionId: 'session_1',
          userId: 'user_1',
          status: AuthSessionStatus.ACTIVE,
        };
      },
      async getActiveContext() {
        return {
          userId: 'user_1',
          membershipId: 'membership_1',
          surface: OperationalSurface.PARTNERS_WEB,
          scopeType: MembershipScopeType.TENANT,
          tenantId: 'tenant_1',
          storeId: null,
          status: MembershipStatus.ACTIVE,
          updatedAt: new Date(),
        };
      },
    };

    it('should return session with minimum required shape', async () => {
      const result = await port.findSessionByIdAndUserId({
        sessionId: 'session_1',
        userId: 'user_1',
      });

      expect(result).toEqual(
        expect.objectContaining({
          sessionId: expect.any(String),
          userId: expect.any(String),
          status: AuthSessionStatus.ACTIVE,
        }),
      );
    });

    it('should return active context with minimum required shape', async () => {
      const result = await port.getActiveContext({
        userId: 'user_1',
        surface: OperationalSurface.PARTNERS_WEB,
      });

      expect(result).toEqual(
        expect.objectContaining({
          userId: expect.any(String),
          membershipId: expect.any(String),
          surface: OperationalSurface.PARTNERS_WEB,
          scopeType: expect.any(String),
          tenantId: expect.any(String),
          status: MembershipStatus.ACTIVE,
          updatedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('AccessMembershipReaderPort', () => {
    const port: AccessMembershipReaderPort = {
      async findAuthorizationAnchorByMembershipId() {
        return {
          membershipId: 'membership_1',
          userId: 'user_1',
          scopeType: MembershipScopeType.TENANT,
          tenantId: 'tenant_1',
          storeId: null,
          status: MembershipStatus.ACTIVE,
        };
      },
    };

    it('should return membership anchor with minimum required shape', async () => {
      const result = await port.findAuthorizationAnchorByMembershipId('membership_1');

      expect(result).toEqual(
        expect.objectContaining({
          membershipId: expect.any(String),
          userId: expect.any(String),
          scopeType: MembershipScopeType.TENANT,
          tenantId: expect.any(String),
          status: MembershipStatus.ACTIVE,
        }),
      );
    });
  });

  describe('AccessRoleReaderPort', () => {
    const port: AccessRoleReaderPort = {
      async listActiveMembershipCapabilities() {
        return [
          {
            roleAssignmentId: 'assignment_1',
            roleId: 'role_1',
            roleKey: 'tenant_admin',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'orders.read',
          },
        ];
      },
    };

    it('should return baseline capabilities with minimum required shape', async () => {
      const result = await port.listActiveMembershipCapabilities('membership_1');

      expect(result[0]).toEqual(
        expect.objectContaining({
          roleAssignmentId: expect.any(String),
          roleId: expect.any(String),
          roleKey: expect.any(String),
          roleScopeType: expect.any(String),
          assignmentStatus: RoleAssignmentStatus.ACTIVE,
          capabilityKey: expect.any(String),
        }),
      );
    });
  });

  describe('AccessGrantReaderPort', () => {
    const port: AccessGrantReaderPort = {
      async listMembershipGrants() {
        return [
          {
            id: 'grant_1',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'orders.read',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
          },
        ];
      },
    };

    it('should return grants with minimum required shape', async () => {
      const result = await port.listMembershipGrants('membership_1');

      expect(result[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          membershipId: expect.any(String),
          effect: expect.any(String),
          targetType: expect.any(String),
          status: expect.any(String),
          validFrom: null,
          validUntil: null,
        }),
      );
    });
  });

});
```

---
## __tests__/access-resolution.controller.e2e-spec.ts
```ts
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
```

---
## __tests__/access-resolution.service.spec.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/__tests__/access-resolution.service.spec.ts

import {
  AuthProvider,
  AuthSessionStatus,
  GrantEffect,
  GrantStatus,
  GrantTargetType,
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
  RoleAssignmentStatus,
  RoleScopeType,
} from '@prisma/client';

import type { AuthenticatedAccessActor } from '../domain/types/access-resolution.types';

import { AccessResolutionService } from '../application/access-resolution.service';
import { AccessResolutionSupportService } from '../application/support/access-resolution-support.service';

import {
  AccessContextNotResolvedError,
  AuthorizationUnresolvableError,
  InvalidAccessSessionError,
  InvalidActiveMembershipError,
  MembershipScopeMismatchError,
  SurfaceScopeConflictError,
} from '../domain/errors/access-resolution.errors';

describe('AccessResolutionService', () => {
  let service: AccessResolutionService;

  const authReader = {
    findSessionByIdAndUserId: jest.fn(),
    getActiveContext: jest.fn(),
  };

  const membershipReader = {
    findAuthorizationAnchorByMembershipId: jest.fn(),
  };

  const roleReader = {
    listActiveMembershipCapabilities: jest.fn(),
  };

  const grantReader = {
    listMembershipGrants: jest.fn(),
  };

  const support = {
    now: jest.fn(),
    recordEvaluation: jest.fn(),
    recordContextResolved: jest.fn(),
    recordEffectivePermissionsComputed: jest.fn(),
  } as unknown as jest.Mocked<AccessResolutionSupportService>;

  const actor: AuthenticatedAccessActor = {
    userId: 'user_1',
    sessionId: 'session_1',
    authIdentityId: 'identity_1',
    provider: AuthProvider.PASSWORD,
    isPlatformAdmin: false,
  };

  const activeMembership = {
    membershipId: 'membership_1',
    userId: 'user_1',
    scopeType: MembershipScopeType.TENANT,
    tenantId: 'tenant_1',
    storeId: null,
    status: MembershipStatus.ACTIVE,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    support.now.mockReturnValue(new Date('2026-04-18T11:00:00.000Z'));
    support.recordEvaluation.mockResolvedValue(undefined);
    support.recordContextResolved.mockResolvedValue(undefined);
    support.recordEffectivePermissionsComputed.mockResolvedValue(undefined);

    service = new AccessResolutionService(
      authReader as any,
      membershipReader as any,
      roleReader as any,
      grantReader as any,
      support,
    );
  });

  describe('evaluateAccess', () => {
    describe('success cases', () => {
        it('allows when baseline capability is present and no deny grant exists', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
            );

            roleReader.listActiveMembershipCapabilities.mockResolvedValue([
            {
                roleAssignmentId: 'assignment_1',
                roleId: 'role_1',
                roleKey: 'tenant_admin',
                roleScopeType: RoleScopeType.TENANT,
                assignmentStatus: RoleAssignmentStatus.ACTIVE,
                capabilityKey: 'orders.read',
            },
            ]);

            grantReader.listMembershipGrants.mockResolvedValue([]);

            const result = await service.evaluateAccess(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
            capabilityKey: ' orders.read ',
            });

            expect(result.allowed).toBe(true);
            expect(result.reasonCode).toBe('access_allowed');
            expect(result.capabilityKey).toBe('orders.read');
            expect(result.explanation.baselineMatchedCapability).toBe(true);
            expect(result.explanation.matchedDenyGrantIds).toEqual([]);
            expect(support.recordEvaluation).toHaveBeenCalledWith(
            expect.objectContaining({
                actorId: 'user_1',
                membershipId: 'membership_1',
                allowed: true,
                reasonCode: 'access_allowed',
                capabilityKey: 'orders.read',
            }),
            );
        });

        it('denies when deny grant applies even if baseline capability exists', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
            );

            roleReader.listActiveMembershipCapabilities.mockResolvedValue([
            {
                roleAssignmentId: 'assignment_1',
                roleId: 'role_1',
                roleKey: 'tenant_admin',
                roleScopeType: RoleScopeType.TENANT,
                assignmentStatus: RoleAssignmentStatus.ACTIVE,
                capabilityKey: 'orders.read',
            },
            ]);

            grantReader.listMembershipGrants.mockResolvedValue([
            {
                id: 'grant_deny_1',
                membershipId: 'membership_1',
                effect: GrantEffect.DENY,
                targetType: GrantTargetType.CAPABILITY,
                capabilityKey: 'orders.read',
                resourceKey: null,
                actionKey: null,
                status: GrantStatus.ACTIVE,
                validFrom: null,
                validUntil: null,
            },
            ]);

            const result = await service.evaluateAccess(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
            capabilityKey: 'orders.read',
            });

            expect(result.allowed).toBe(false);
            expect(result.reasonCode).toBe('access_denied');
            expect(result.explanation.baselineMatchedCapability).toBe(true);
            expect(result.explanation.matchedDenyGrantIds).toEqual(['grant_deny_1']);
        });

        it('allows by explicit allow grant even without baseline capability', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
            );

            roleReader.listActiveMembershipCapabilities.mockResolvedValue([]);

            grantReader.listMembershipGrants.mockResolvedValue([
            {
                id: 'grant_allow_1',
                membershipId: 'membership_1',
                effect: GrantEffect.ALLOW,
                targetType: GrantTargetType.CAPABILITY,
                capabilityKey: 'catalog.publish',
                resourceKey: null,
                actionKey: null,
                status: GrantStatus.ACTIVE,
                validFrom: null,
                validUntil: null,
            },
            ]);

            const result = await service.evaluateAccess(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
            capabilityKey: 'catalog.publish',
            });

            expect(result.allowed).toBe(true);
            expect(result.reasonCode).toBe('access_allowed');
            expect(result.explanation.baselineMatchedCapability).toBe(false);
            expect(result.explanation.matchedAllowGrantIds).toEqual(['grant_allow_1']);
        });

        it('denies when allow and deny grants both apply and deny prevails', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
                sessionId: 'session_1',
                userId: 'user_1',
                status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
                userId: 'user_1',
                membershipId: 'membership_1',
                surface: OperationalSurface.PARTNERS_WEB,
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_1',
                storeId: null,
                status: MembershipStatus.ACTIVE,
                updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
                activeMembership,
            );

            roleReader.listActiveMembershipCapabilities.mockResolvedValue([]);

            grantReader.listMembershipGrants.mockResolvedValue([
                {
                id: 'grant_allow_1',
                membershipId: 'membership_1',
                effect: GrantEffect.ALLOW,
                targetType: GrantTargetType.CAPABILITY,
                capabilityKey: 'orders.read',
                resourceKey: null,
                actionKey: null,
                status: GrantStatus.ACTIVE,
                validFrom: null,
                validUntil: null,
                },
                {
                id: 'grant_deny_1',
                membershipId: 'membership_1',
                effect: GrantEffect.DENY,
                targetType: GrantTargetType.CAPABILITY,
                capabilityKey: 'orders.read',
                resourceKey: null,
                actionKey: null,
                status: GrantStatus.ACTIVE,
                validFrom: null,
                validUntil: null,
                },
            ]);

            const result = await service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: 'orders.read',
            });

            expect(result.allowed).toBe(false);
            expect(result.reasonCode).toBe('access_denied');
            expect(result.explanation.baselineMatchedCapability).toBe(false);
            expect(result.explanation.matchedAllowGrantIds).toEqual(['grant_allow_1']);
            expect(result.explanation.matchedDenyGrantIds).toEqual(['grant_deny_1']);
        });

        it('denies by default when no baseline capability and no applicable grants exist', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
                sessionId: 'session_1',
                userId: 'user_1',
                status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
                userId: 'user_1',
                membershipId: 'membership_1',
                surface: OperationalSurface.PARTNERS_WEB,
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_1',
                storeId: null,
                status: MembershipStatus.ACTIVE,
                updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
                activeMembership,
            );

            roleReader.listActiveMembershipCapabilities.mockResolvedValue([]);
            grantReader.listMembershipGrants.mockResolvedValue([]);

            const result = await service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: 'orders.read',
            });

            expect(result.allowed).toBe(false);
            expect(result.reasonCode).toBe('access_denied');
            expect(result.explanation.baselineMatchedCapability).toBe(false);
            expect(result.explanation.matchedAllowGrantIds).toEqual([]);
            expect(result.explanation.matchedDenyGrantIds).toEqual([]);
        });

        it('resolves the same access decision from capabilityKey or equivalent resourceKey + actionKey', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
                sessionId: 'session_1',
                userId: 'user_1',
                status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
                userId: 'user_1',
                membershipId: 'membership_1',
                surface: OperationalSurface.PARTNERS_WEB,
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_1',
                storeId: null,
                status: MembershipStatus.ACTIVE,
                updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
                activeMembership,
            );

            roleReader.listActiveMembershipCapabilities.mockResolvedValue([
                {
                roleAssignmentId: 'assignment_1',
                roleId: 'role_1',
                roleKey: 'tenant_admin',
                roleScopeType: RoleScopeType.TENANT,
                assignmentStatus: RoleAssignmentStatus.ACTIVE,
                capabilityKey: 'orders.write',
                },
            ]);

            grantReader.listMembershipGrants.mockResolvedValue([]);

            const byCapability = await service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: ' orders.write ',
            });

            const byResourceAction = await service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                resourceKey: ' Orders ',
                actionKey: ' Write ',
            });

            expect(byCapability.allowed).toBe(true);
            expect(byResourceAction.allowed).toBe(true);

            expect(byCapability.reasonCode).toBe(byResourceAction.reasonCode);
            expect(byCapability.capabilityKey).toBe('orders.write');
            expect(byResourceAction.capabilityKey).toBe('orders.write');
            expect(byCapability.resourceKey).toBeNull();
            expect(byResourceAction.resourceKey).toBe('orders');
            expect(byResourceAction.actionKey).toBe('write');
        });

        it('denies when an allow grant exists but is already expired', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
                sessionId: 'session_1',
                userId: 'user_1',
                status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
                userId: 'user_1',
                membershipId: 'membership_1',
                surface: OperationalSurface.PARTNERS_WEB,
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_1',
                storeId: null,
                status: MembershipStatus.ACTIVE,
                updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
                activeMembership,
            );

            roleReader.listActiveMembershipCapabilities.mockResolvedValue([]);

            grantReader.listMembershipGrants.mockResolvedValue([
                {
                id: 'grant_allow_expired_1',
                membershipId: 'membership_1',
                effect: GrantEffect.ALLOW,
                targetType: GrantTargetType.CAPABILITY,
                capabilityKey: 'orders.read',
                resourceKey: null,
                actionKey: null,
                status: GrantStatus.ACTIVE,
                validFrom: null,
                validUntil: new Date('2026-04-18T10:59:59.000Z'),
                },
            ]);

            const result = await service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: 'orders.read',
            });

            expect(result.allowed).toBe(false);
            expect(result.reasonCode).toBe('access_denied');
            expect(result.explanation.baselineMatchedCapability).toBe(false);
            expect(result.explanation.matchedAllowGrantIds).toEqual([]);
            expect(result.explanation.matchedDenyGrantIds).toEqual([]);
        });

        it('prefers explicit membershipId over active context when both are available', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
                sessionId: 'session_1',
                userId: 'user_1',
                status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
                userId: 'user_1',
                membershipId: 'membership_from_context',
                surface: OperationalSurface.PARTNERS_WEB,
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_context',
                storeId: null,
                status: MembershipStatus.ACTIVE,
                updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue({
                membershipId: 'membership_explicit',
                userId: 'user_1',
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_explicit',
                storeId: null,
                status: MembershipStatus.ACTIVE,
            });

            roleReader.listActiveMembershipCapabilities.mockResolvedValue([
                {
                roleAssignmentId: 'assignment_1',
                roleId: 'role_1',
                roleKey: 'tenant_admin',
                roleScopeType: RoleScopeType.TENANT,
                assignmentStatus: RoleAssignmentStatus.ACTIVE,
                capabilityKey: 'orders.read',
                },
            ]);

            grantReader.listMembershipGrants.mockResolvedValue([]);

            const result = await service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                membershipId: 'membership_explicit',
                capabilityKey: 'orders.read',
            });

            expect(membershipReader.findAuthorizationAnchorByMembershipId).toHaveBeenCalledWith(
                'membership_explicit',
            );
            expect(result.membership?.membershipId).toBe('membership_explicit');
            expect(result.membership?.tenantId).toBe('tenant_explicit');
        });
    });

    describe('failure cases', () => {
        it('throws InvalidAccessSessionError when session is missing', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue(null);

            await expect(
            service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: 'orders.read',
            }),
            ).rejects.toBeInstanceOf(InvalidAccessSessionError);
        });

        it('throws AuthorizationUnresolvableError when neither capability nor resource/action is provided', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
            });

            await expect(
            service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
            }),
            ).rejects.toBeInstanceOf(AuthorizationUnresolvableError);
        });

        it('throws AccessContextNotResolvedError when membership cannot be resolved', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue(null);

            await expect(
            service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: 'orders.read',
            }),
            ).rejects.toBeInstanceOf(AccessContextNotResolvedError);
        });

        it('throws InvalidActiveMembershipError when membership status is not ACTIVE', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.SUSPENDED,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue({
            ...activeMembership,
            status: MembershipStatus.SUSPENDED,
            });

            await expect(
            service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: 'orders.read',
            }),
            ).rejects.toBeInstanceOf(InvalidActiveMembershipError);
        });

        it('throws MembershipScopeMismatchError when explicit membership belongs to another user', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue({
            ...activeMembership,
            userId: 'other_user',
            });

            await expect(
            service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: 'orders.read',
                membershipId: 'membership_999',
            }),
            ).rejects.toBeInstanceOf(MembershipScopeMismatchError);
        });

        it('throws SurfaceScopeConflictError when surface is incompatible with membership', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: 'UNKNOWN_SURFACE' as any,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
            );

            await expect(
            service.evaluateAccess(actor, {
                surface: 'UNKNOWN_SURFACE' as any,
                capabilityKey: 'orders.read',
            }),
            ).rejects.toBeInstanceOf(SurfaceScopeConflictError);
        });   

        it('throws AccessContextNotResolvedError when active context points to a membership that cannot be resolved', async () => {
            authReader.findSessionByIdAndUserId.mockResolvedValue({
                sessionId: 'session_1',
                userId: 'user_1',
                status: AuthSessionStatus.ACTIVE,
            });

            authReader.getActiveContext.mockResolvedValue({
                userId: 'user_1',
                membershipId: 'membership_missing',
                surface: OperationalSurface.PARTNERS_WEB,
                scopeType: MembershipScopeType.TENANT,
                tenantId: 'tenant_1',
                storeId: null,
                status: MembershipStatus.ACTIVE,
                updatedAt: new Date('2026-04-18T10:50:00.000Z'),
            });

            membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(null);

            await expect(
                service.evaluateAccess(actor, {
                surface: OperationalSurface.PARTNERS_WEB,
                capabilityKey: 'orders.read',
                }),
            ).rejects.toBeInstanceOf(AccessContextNotResolvedError);
        });
    });
  });

  describe('listEffectivePermissions', () => {
    it('listEffectivePermissions removes baseline capability when an active deny grant targets it', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([
            {
            roleAssignmentId: 'assignment_1',
            roleId: 'role_1',
            roleKey: 'tenant_admin',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'orders.read',
            },
        ]);

        grantReader.listMembershipGrants.mockResolvedValue([
            {
            id: 'grant_deny_1',
            membershipId: 'membership_1',
            effect: GrantEffect.DENY,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'orders.read',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
            },
        ]);

        const result = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.capabilityKeys).toEqual([]);
    });

    it('listEffectivePermissions adds capability granted by active allow grant even without baseline', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([]);

        grantReader.listMembershipGrants.mockResolvedValue([
            {
            id: 'grant_allow_1',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'catalog.publish',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
            },
        ]);

        const result = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.capabilityKeys).toEqual(['catalog.publish']);
    });

    it('listEffectivePermissions derives capability from resource_action grants', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([]);

        grantReader.listMembershipGrants.mockResolvedValue([
            {
            id: 'grant_allow_ra_1',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.RESOURCE_ACTION,
            capabilityKey: null,
            resourceKey: 'Orders',
            actionKey: 'Write',
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
            },
        ]);

        const result = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.capabilityKeys).toEqual(['orders.write']);
    });

    it('evaluateAccess is consistent with listEffectivePermissions for the same resolved capability', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([
            {
            roleAssignmentId: 'assignment_1',
            roleId: 'role_1',
            roleKey: 'tenant_admin',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'orders.read',
            },
        ]);

        grantReader.listMembershipGrants.mockResolvedValue([
            {
            id: 'grant_deny_1',
            membershipId: 'membership_1',
            effect: GrantEffect.DENY,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'orders.read',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
            },
        ]);

        const permissions = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        const decision = await service.evaluateAccess(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
            capabilityKey: 'orders.read',
        });

        expect(permissions.capabilityKeys.includes('orders.read')).toBe(false);
        expect(decision.allowed).toBe(false);
        expect(decision.reasonCode).toBe('access_denied');
    });

    it('listEffectivePermissions returns normalized, deduplicated and sorted capability keys', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([
            {
            roleAssignmentId: 'assignment_1',
            roleId: 'role_1',
            roleKey: 'tenant_admin',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: ' Orders.Read ',
            },
            {
            roleAssignmentId: 'assignment_2',
            roleId: 'role_2',
            roleKey: 'catalog_manager',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'catalog.publish',
            },
            {
            roleAssignmentId: 'assignment_3',
            roleId: 'role_3',
            roleKey: 'sales_admin',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'orders.read',
            },
        ]);

        grantReader.listMembershipGrants.mockResolvedValue([
            {
            id: 'grant_allow_1',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: ' users.manage ',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
            },
            {
            id: 'grant_allow_2',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'catalog.publish',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
            },
        ]);

        const result = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.capabilityKeys).toEqual([
            'catalog.publish',
            'orders.read',
            'users.manage',
        ]);
    });

    it('listEffectivePermissions removes capability when allow and deny grants conflict and deny prevails', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([]);

        grantReader.listMembershipGrants.mockResolvedValue([
            {
            id: 'grant_allow_1',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'orders.read',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
            },
            {
            id: 'grant_deny_1',
            membershipId: 'membership_1',
            effect: GrantEffect.DENY,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'orders.read',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
            },
        ]);

        const result = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.capabilityKeys).not.toContain('orders.read');
        expect(result.capabilityKeys).toEqual([]);
    });

    it('listEffectivePermissions returns baseline capabilities when there are no grants', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([
            {
            roleAssignmentId: 'assignment_1',
            roleId: 'role_1',
            roleKey: 'tenant_admin',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'orders.read',
            },
            {
            roleAssignmentId: 'assignment_2',
            roleId: 'role_2',
            roleKey: 'catalog_manager',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'catalog.publish',
            },
        ]);

        grantReader.listMembershipGrants.mockResolvedValue([]);

        const result = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.capabilityKeys).toEqual([
            'catalog.publish',
            'orders.read',
        ]);

        expect(support.recordEffectivePermissionsComputed).toHaveBeenCalledWith(
            expect.objectContaining({
            actorId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            capabilityCount: 2,
            }),
        );
    });

    it('listEffectivePermissions returns an empty list when there are no baseline capabilities and no applicable grants', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([]);
        grantReader.listMembershipGrants.mockResolvedValue([]);

        const result = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.capabilityKeys).toEqual([]);

        expect(support.recordEffectivePermissionsComputed).toHaveBeenCalledWith(
            expect.objectContaining({
            actorId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            capabilityCount: 0,
            }),
        );
    });

    it('listEffectivePermissions ignores grants outside their validity window', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
            sessionId: 'session_1',
            userId: 'user_1',
            status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
            userId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            scopeType: MembershipScopeType.TENANT,
            tenantId: 'tenant_1',
            storeId: null,
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
            activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([
            {
            roleAssignmentId: 'assignment_1',
            roleId: 'role_1',
            roleKey: 'tenant_admin',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'orders.read',
            },
        ]);

        grantReader.listMembershipGrants.mockResolvedValue([
            {
            id: 'grant_allow_future_1',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'users.manage',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: new Date('2026-04-18T11:00:01.000Z'),
            validUntil: null,
            },
            {
            id: 'grant_deny_expired_1',
            membershipId: 'membership_1',
            effect: GrantEffect.DENY,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'orders.read',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: new Date('2026-04-18T10:59:59.000Z'),
            },
        ]);

        const result = await service.listEffectivePermissions(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.capabilityKeys).toEqual(['orders.read']);
    });
  });

  describe('resolveAccessContext', () => {
    it('returns session, active context, membership and effective capability keys for a valid active context', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
        userId: 'user_1',
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
        updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue({
        membershipId: 'membership_1',
        userId: 'user_1',
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
        });

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([
        {
            roleAssignmentId: 'assignment_1',
            roleId: 'role_1',
            roleKey: 'store_manager',
            roleScopeType: RoleScopeType.STORE,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'orders.read',
        },
        ]);

        grantReader.listMembershipGrants.mockResolvedValue([
        {
            id: 'grant_allow_1',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'catalog.publish',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
        },
        ]);

        const result = await service.resolveAccessContext(actor, {
        surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.session).toEqual({
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.ACTIVE,
        });

        expect(result.activeContext).toEqual({
        userId: 'user_1',
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
        updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        expect(result.membership).toEqual({
        membershipId: 'membership_1',
        userId: 'user_1',
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
        });

        expect(result.effectiveCapabilityKeys).toEqual([
        'catalog.publish',
        'orders.read',
        ]);

        expect(support.recordContextResolved).toHaveBeenCalledWith(
        expect.objectContaining({
            actorId: 'user_1',
            membershipId: 'membership_1',
            surface: OperationalSurface.PARTNERS_WEB,
            effectiveCapabilityCount: 2,
        }),
        );
    });

    it('throws AccessContextNotResolvedError when there is no active context and no explicit membershipId', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue(null);

        await expect(
        service.resolveAccessContext(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        }),
        ).rejects.toBeInstanceOf(AccessContextNotResolvedError);
    });

    it('throws InvalidActiveMembershipError when active context resolves to a suspended membership', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
        userId: 'user_1',
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: MembershipStatus.SUSPENDED,
        updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue({
        ...activeMembership,
        status: MembershipStatus.SUSPENDED,
        });

        await expect(
        service.resolveAccessContext(actor, {
            surface: OperationalSurface.PARTNERS_WEB,
        }),
        ).rejects.toBeInstanceOf(InvalidActiveMembershipError);
    });

    it('throws SurfaceScopeConflictError when active context resolves to an incompatible surface', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.ACTIVE,
        });

        authReader.getActiveContext.mockResolvedValue({
        userId: 'user_1',
        membershipId: 'membership_1',
        surface: 'UNKNOWN_SURFACE' as any,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: MembershipStatus.ACTIVE,
        updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
        activeMembership,
        );

        await expect(
        service.resolveAccessContext(actor, {
            surface: 'UNKNOWN_SURFACE' as any,
        }),
        ).rejects.toBeInstanceOf(SurfaceScopeConflictError);
    });

    it('returns effective capability keys computed from baseline and grants', async () => {
        authReader.findSessionByIdAndUserId.mockResolvedValue({
        sessionId: 'session_1',
        userId: 'user_1',
        status: AuthSessionStatus.REFRESHED,
        });

        authReader.getActiveContext.mockResolvedValue({
        userId: 'user_1',
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: MembershipStatus.ACTIVE,
        updatedAt: new Date('2026-04-18T10:50:00.000Z'),
        });

        membershipReader.findAuthorizationAnchorByMembershipId.mockResolvedValue(
        activeMembership,
        );

        roleReader.listActiveMembershipCapabilities.mockResolvedValue([
        {
            roleAssignmentId: 'assignment_1',
            roleId: 'role_1',
            roleKey: 'tenant_admin',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'orders.read',
        },
        {
            roleAssignmentId: 'assignment_2',
            roleId: 'role_2',
            roleKey: 'catalog_manager',
            roleScopeType: RoleScopeType.TENANT,
            assignmentStatus: RoleAssignmentStatus.ACTIVE,
            capabilityKey: 'catalog.publish',
        },
        ]);

        grantReader.listMembershipGrants.mockResolvedValue([
        {
            id: 'grant_deny_1',
            membershipId: 'membership_1',
            effect: GrantEffect.DENY,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'orders.read',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
        },
        {
            id: 'grant_allow_1',
            membershipId: 'membership_1',
            effect: GrantEffect.ALLOW,
            targetType: GrantTargetType.CAPABILITY,
            capabilityKey: 'users.manage',
            resourceKey: null,
            actionKey: null,
            status: GrantStatus.ACTIVE,
            validFrom: null,
            validUntil: null,
        },
        ]);

        const result = await service.resolveAccessContext(actor, {
        surface: OperationalSurface.PARTNERS_WEB,
        });

        expect(result.effectiveCapabilityKeys).toEqual([
        'catalog.publish',
        'users.manage',
        ]);
    });
  });

  
});
```

---
## __tests__/access-resolution-support.service.spec.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/__tests__/access-resolution-support.service.spec.ts

import { OperationalSurface } from '@prisma/client';

import { AccessResolutionSupportService } from '../application/support/access-resolution-support.service';
import {
  ACCESS_RESOLUTION_AUDIT_ACTIONS,
} from '../domain/constants/access-resolution.constants';
import { AccessResolutionDomainEvents } from '../domain/events/access-resolution.events';

describe('AccessResolutionSupportService', () => {
  let service: AccessResolutionSupportService;

  const auditPort = {
    record: jest.fn(),
  };

  const eventsPort = {
    publish: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    auditPort.record.mockResolvedValue(undefined);
    eventsPort.publish.mockResolvedValue(undefined);

    service = new AccessResolutionSupportService(
      auditPort as any,
      eventsPort as any,
    );
  });

  describe('now', () => {
    it('returns a Date instance', () => {
      const result = service.now();

      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('recordEvaluation', () => {
    it('audits access_evaluated with normalized nullable fields and publishes access_evaluated event', async () => {
      const at = new Date('2026-04-18T12:00:00.000Z');

      await service.recordEvaluation({
        actorId: 'user_1',
        membershipId: 'membership_1',
        allowed: false,
        reasonCode: 'access_denied',
        capabilityKey: 'orders.write',
        resourceKey: 'orders',
        actionKey: 'write',
        at,
      });

      expect(auditPort.record).toHaveBeenCalledTimes(1);
      expect(auditPort.record).toHaveBeenCalledWith({
        action: ACCESS_RESOLUTION_AUDIT_ACTIONS.ACCESS_EVALUATED,
        actorId: 'user_1',
        targetId: 'membership_1',
        payload: {
          allowed: false,
          reasonCode: 'access_denied',
          capabilityKey: 'orders.write',
          resourceKey: 'orders',
          actionKey: 'write',
        },
        at,
      });

      expect(eventsPort.publish).toHaveBeenCalledTimes(1);
      expect(eventsPort.publish).toHaveBeenCalledWith({
        eventName: AccessResolutionDomainEvents.ACCESS_EVALUATED,
        payload: {
          actorId: 'user_1',
          membershipId: 'membership_1',
          allowed: false,
          reasonCode: 'access_denied',
          at,
        },
      });
    });

    it('uses null membershipId and nullable target fields when optional values are omitted', async () => {
      const at = new Date('2026-04-18T12:05:00.000Z');

      await service.recordEvaluation({
        actorId: 'user_1',
        membershipId: null,
        allowed: true,
        reasonCode: 'access_allowed',
        capabilityKey: null,
        resourceKey: undefined,
        actionKey: undefined,
        at,
      });

      expect(auditPort.record).toHaveBeenCalledWith({
        action: ACCESS_RESOLUTION_AUDIT_ACTIONS.ACCESS_EVALUATED,
        actorId: 'user_1',
        targetId: null,
        payload: {
          allowed: true,
          reasonCode: 'access_allowed',
          capabilityKey: null,
          resourceKey: null,
          actionKey: null,
        },
        at,
      });

      expect(eventsPort.publish).toHaveBeenCalledWith({
        eventName: AccessResolutionDomainEvents.ACCESS_EVALUATED,
        payload: {
          actorId: 'user_1',
          membershipId: null,
          allowed: true,
          reasonCode: 'access_allowed',
          at,
        },
      });
    });

    it('does not publish event when audit recording fails', async () => {
      const at = new Date('2026-04-18T12:10:00.000Z');
      auditPort.record.mockRejectedValueOnce(new Error('audit_failed'));

      await expect(
        service.recordEvaluation({
          actorId: 'user_1',
          membershipId: 'membership_1',
          allowed: true,
          reasonCode: 'access_allowed',
          capabilityKey: 'orders.read',
          resourceKey: 'orders',
          actionKey: 'read',
          at,
        }),
      ).rejects.toThrow('audit_failed');

      expect(eventsPort.publish).not.toHaveBeenCalled();
    });
  });

  describe('recordContextResolved', () => {
    it('audits context_resolved and publishes access_context_resolved event', async () => {
      const at = new Date('2026-04-18T12:15:00.000Z');

      await service.recordContextResolved({
        actorId: 'user_1',
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        effectiveCapabilityCount: 7,
        at,
      });

      expect(auditPort.record).toHaveBeenCalledTimes(1);
      expect(auditPort.record).toHaveBeenCalledWith({
        action: ACCESS_RESOLUTION_AUDIT_ACTIONS.ACCESS_CONTEXT_RESOLVED,
        actorId: 'user_1',
        targetId: 'membership_1',
        payload: {
          surface: OperationalSurface.PARTNERS_WEB,
          effectiveCapabilityCount: 7,
        },
        at,
      });

      expect(eventsPort.publish).toHaveBeenCalledTimes(1);
      expect(eventsPort.publish).toHaveBeenCalledWith({
        eventName: AccessResolutionDomainEvents.ACCESS_CONTEXT_RESOLVED,
        payload: {
          actorId: 'user_1',
          membershipId: 'membership_1',
          surface: OperationalSurface.PARTNERS_WEB,
          effectiveCapabilityCount: 7,
          at,
        },
      });
    });

    it('uses null targetId when membershipId is not resolved', async () => {
      const at = new Date('2026-04-18T12:20:00.000Z');

      await service.recordContextResolved({
        actorId: 'user_1',
        membershipId: null,
        surface: OperationalSurface.PARTNERS_WEB,
        effectiveCapabilityCount: 0,
        at,
      });

      expect(auditPort.record).toHaveBeenCalledWith({
        action: ACCESS_RESOLUTION_AUDIT_ACTIONS.ACCESS_CONTEXT_RESOLVED,
        actorId: 'user_1',
        targetId: null,
        payload: {
          surface: OperationalSurface.PARTNERS_WEB,
          effectiveCapabilityCount: 0,
        },
        at,
      });

      expect(eventsPort.publish).toHaveBeenCalledWith({
        eventName: AccessResolutionDomainEvents.ACCESS_CONTEXT_RESOLVED,
        payload: {
          actorId: 'user_1',
          membershipId: null,
          surface: OperationalSurface.PARTNERS_WEB,
          effectiveCapabilityCount: 0,
          at,
        },
      });
    });

    it('does not publish event when audit recording fails', async () => {
      const at = new Date('2026-04-18T12:25:00.000Z');
      auditPort.record.mockRejectedValueOnce(new Error('audit_failed'));

      await expect(
        service.recordContextResolved({
          actorId: 'user_1',
          membershipId: 'membership_1',
          surface: OperationalSurface.PARTNERS_WEB,
          effectiveCapabilityCount: 3,
          at,
        }),
      ).rejects.toThrow('audit_failed');

      expect(eventsPort.publish).not.toHaveBeenCalled();
    });
  });

  describe('recordEffectivePermissionsComputed', () => {
    it('audits effective_permissions_computed and publishes effective_permissions_computed event', async () => {
      const at = new Date('2026-04-18T12:30:00.000Z');

      await service.recordEffectivePermissionsComputed({
        actorId: 'user_1',
        membershipId: 'membership_1',
        surface: OperationalSurface.PARTNERS_WEB,
        capabilityCount: 12,
        at,
      });

      expect(auditPort.record).toHaveBeenCalledTimes(1);
      expect(auditPort.record).toHaveBeenCalledWith({
        action: ACCESS_RESOLUTION_AUDIT_ACTIONS.EFFECTIVE_PERMISSIONS_COMPUTED,
        actorId: 'user_1',
        targetId: 'membership_1',
        payload: {
          surface: OperationalSurface.PARTNERS_WEB,
          capabilityCount: 12,
        },
        at,
      });

      expect(eventsPort.publish).toHaveBeenCalledTimes(1);
      expect(eventsPort.publish).toHaveBeenCalledWith({
        eventName: AccessResolutionDomainEvents.EFFECTIVE_PERMISSIONS_COMPUTED,
        payload: {
          actorId: 'user_1',
          membershipId: 'membership_1',
          surface: OperationalSurface.PARTNERS_WEB,
          capabilityCount: 12,
          at,
        },
      });
    });

    it('does not publish event when audit recording fails', async () => {
      const at = new Date('2026-04-18T12:35:00.000Z');
      auditPort.record.mockRejectedValueOnce(new Error('audit_failed'));

      await expect(
        service.recordEffectivePermissionsComputed({
          actorId: 'user_1',
          membershipId: 'membership_1',
          surface: OperationalSurface.PARTNERS_WEB,
          capabilityCount: 5,
          at,
        }),
      ).rejects.toThrow('audit_failed');

      expect(eventsPort.publish).not.toHaveBeenCalled();
    });
  });
});
```

---
## __tests__/access-scope-compatibility.rule.spec.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/__tests__/access-scope-compatibility.rule.spec.ts

import {
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
} from '@prisma/client';
import { isMembershipCompatibleWithSurface } from '../domain/rules/access-scope-compatibility.rule';

describe('isMembershipCompatibleWithSurface', () => {
  const baseMembership = {
    membershipId: 'membership_1',
    userId: 'user_1',
    tenantId: 'tenant_1',
    storeId: null,
    status: MembershipStatus.ACTIVE,
  };

  it('allows TENANT membership on PARTNERS_WEB', () => {
    expect(
      isMembershipCompatibleWithSurface({
        membership: {
          ...baseMembership,
          scopeType: MembershipScopeType.TENANT,
        },
        surface: OperationalSurface.PARTNERS_WEB,
      }),
    ).toBe(true);
  });

  it('allows STORE membership on PARTNERS_WEB', () => {
    expect(
      isMembershipCompatibleWithSurface({
        membership: {
          ...baseMembership,
          scopeType: MembershipScopeType.STORE,
          storeId: 'store_1',
        },
        surface: OperationalSurface.PARTNERS_WEB,
      }),
    ).toBe(true);
  });
});
```

---
## __tests__/effective-permission.mapper.spec.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/__tests__/effective-permission.mapper.spec.ts

import {
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
} from '@prisma/client';

import { EffectivePermissionMapper } from '../mappers/effective-permission.mapper';

describe('EffectivePermissionMapper', () => {
  let mapper: EffectivePermissionMapper;

  beforeEach(() => {
    mapper = new EffectivePermissionMapper();
  });

  it('maps effective permissions to response dto', () => {
    const evaluatedAt = new Date('2026-04-18T12:00:00.000Z');

    const result = mapper.toResponse({
      surface: OperationalSurface.PARTNERS_WEB,
      membership: {
        membershipId: 'membership_1',
        userId: 'user_1',
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
        status: MembershipStatus.ACTIVE,
      },
      capabilityKeys: ['catalog.publish', 'orders.read', 'users.manage'],
      evaluatedAt,
    });

    expect(result).toEqual({
      surface: OperationalSurface.PARTNERS_WEB,
      membership: {
        membershipId: 'membership_1',
        scopeType: MembershipScopeType.STORE,
        tenantId: 'tenant_1',
        storeId: 'store_1',
      },
      capabilityKeys: ['catalog.publish', 'orders.read', 'users.manage'],
      evaluatedAt,
    });
  });

  it('passes through capability keys exactly as received from the service', () => {
    const result = mapper.toResponse({
      surface: OperationalSurface.PARTNERS_WEB,
      membership: {
        membershipId: 'membership_1',
        userId: 'user_1',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: MembershipStatus.ACTIVE,
      },
      capabilityKeys: ['catalog.publish', 'orders.read', 'users.manage'],
      evaluatedAt: new Date('2026-04-18T12:00:00.000Z'),
    });

    expect(result.capabilityKeys).toEqual([
      'catalog.publish',
      'orders.read',
      'users.manage',
    ]);
  });

  it('includes evaluatedAt', () => {
    const evaluatedAt = new Date('2026-04-18T12:00:00.000Z');

    const result = mapper.toResponse({
      surface: OperationalSurface.PARTNERS_WEB,
      membership: {
        membershipId: 'membership_1',
        userId: 'user_1',
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_1',
        storeId: null,
        status: MembershipStatus.ACTIVE,
      },
      capabilityKeys: [],
      evaluatedAt,
    });

    expect(result.evaluatedAt).toBe(evaluatedAt);
  });
});
```

---
## access-resolution.controller.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/access-resolution.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { AccessResolutionFacadeService } from './access-resolution.service';
import { CurrentAccessActor } from './decorators/current-access-actor.decorator';
import { AccessResolutionAuthenticatedGuard } from './guards/access-resolution-authenticated.guard';

import { EvaluateAccessQueryDto } from './dto/queries/evaluate-access.query.dto';
import { ResolveAccessContextQueryDto } from './dto/queries/resolve-access-context.query.dto';
import { ListEffectivePermissionsQueryDto } from './dto/queries/list-effective-permissions.query.dto';

import { AccessDecisionMapper } from './mappers/access-decision.mapper';
import { AccessContextMapper } from './mappers/access-context.mapper';
import { EffectivePermissionMapper } from './mappers/effective-permission.mapper';

import type { AuthenticatedAccessActor } from './domain/types/access-resolution.types';

@Controller('v1/access-resolution')
@UseGuards(AccessResolutionAuthenticatedGuard)
export class AccessResolutionController {
  constructor(
    private readonly accessResolutionService: AccessResolutionFacadeService,
    private readonly accessDecisionMapper: AccessDecisionMapper,
    private readonly accessContextMapper: AccessContextMapper,
    private readonly effectivePermissionMapper: EffectivePermissionMapper,
  ) {}

  @Get('evaluate')
  async evaluate(
    @CurrentAccessActor() actor: AuthenticatedAccessActor,
    @Query() query: EvaluateAccessQueryDto,
  ) {
    const result = await this.accessResolutionService.evaluateAccess(actor, query);
    return this.accessDecisionMapper.toResponse(result);
  }

  @Get('context')
  async resolveContext(
    @CurrentAccessActor() actor: AuthenticatedAccessActor,
    @Query() query: ResolveAccessContextQueryDto,
  ) {
    const result = await this.accessResolutionService.resolveAccessContext(
      actor,
      query,
    );
    return this.accessContextMapper.toResponse(result);
  }

  @Get('effective-permissions')
  async listEffectivePermissions(
    @CurrentAccessActor() actor: AuthenticatedAccessActor,
    @Query() query: ListEffectivePermissionsQueryDto,
  ) {
    const result =
      await this.accessResolutionService.listEffectivePermissions(actor, query);

    return this.effectivePermissionMapper.toResponse(result);
  }
}
```

---
## access-resolution.module.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/access-resolution.module.ts

import { Module } from '@nestjs/common';

import { AccessResolutionController } from './access-resolution.controller';
import { AccessResolutionFacadeService } from './access-resolution.service';
import { AccessResolutionService } from './application/access-resolution.service';
import { AccessResolutionSupportService } from './application/support/access-resolution-support.service';

import { AccessDecisionMapper } from './mappers/access-decision.mapper';
import { AccessContextMapper } from './mappers/access-context.mapper';
import { EffectivePermissionMapper } from './mappers/effective-permission.mapper';

import { AccessResolutionAuthenticatedGuard } from './guards/access-resolution-authenticated.guard';

import {
  ACCESS_RESOLUTION_AUDIT_PORT,
} from './ports/access-resolution-audit.port';
import {
  ACCESS_RESOLUTION_EVENTS_PORT,
} from './ports/access-resolution-events.port';
import { ACCESS_AUTH_READER_PORT } from './ports/access-auth-reader.port';
import { ACCESS_MEMBERSHIP_READER_PORT } from './ports/access-membership-reader.port';
import { ACCESS_ROLE_READER_PORT } from './ports/access-role-reader.port';
import { ACCESS_GRANT_READER_PORT } from './ports/access-grant-reader.port';

import { NoopAccessResolutionAuditAdapter } from './adapters/audit/noop-access-resolution-audit.adapter';
import { NoopAccessResolutionEventsAdapter } from './adapters/events/noop-access-resolution-events.adapter';
import { NoopAccessAuthReaderAdapter } from './adapters/auth/noop-access-auth-reader.adapter';
import { NoopAccessMembershipReaderAdapter } from './adapters/memberships/noop-access-membership-reader.adapter';
import { NoopAccessRoleReaderAdapter } from './adapters/roles/noop-access-role-reader.adapter';
import { NoopAccessGrantReaderAdapter } from './adapters/grants/noop-access-grant-reader.adapter';

@Module({
  controllers: [AccessResolutionController],
  providers: [
    AccessResolutionFacadeService,
    AccessResolutionService,
    AccessResolutionSupportService,

    AccessDecisionMapper,
    AccessContextMapper,
    EffectivePermissionMapper,

    AccessResolutionAuthenticatedGuard,

    {
      provide: ACCESS_RESOLUTION_AUDIT_PORT,
      useClass: NoopAccessResolutionAuditAdapter,
    },
    {
      provide: ACCESS_RESOLUTION_EVENTS_PORT,
      useClass: NoopAccessResolutionEventsAdapter,
    },
    {
      provide: ACCESS_AUTH_READER_PORT,
      useClass: NoopAccessAuthReaderAdapter,
    },
    {
      provide: ACCESS_MEMBERSHIP_READER_PORT,
      useClass: NoopAccessMembershipReaderAdapter,
    },
    {
      provide: ACCESS_ROLE_READER_PORT,
      useClass: NoopAccessRoleReaderAdapter,
    },
    {
      provide: ACCESS_GRANT_READER_PORT,
      useClass: NoopAccessGrantReaderAdapter,
    },
  ],
  exports: [AccessResolutionFacadeService, AccessResolutionService],
})
export class AccessResolutionModule {}
```

---
## access-resolution.service.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/access-resolution.service.ts

import { Injectable } from '@nestjs/common';

import { AccessResolutionService as AccessResolutionApplicationService } from './application/access-resolution.service';

import { EvaluateAccessQueryDto } from './dto/queries/evaluate-access.query.dto';
import { ResolveAccessContextQueryDto } from './dto/queries/resolve-access-context.query.dto';
import { ListEffectivePermissionsQueryDto } from './dto/queries/list-effective-permissions.query.dto';

import { AuthenticatedAccessActor } from './domain/types/access-resolution.types';

@Injectable()
export class AccessResolutionFacadeService {
  constructor(
    private readonly applicationService: AccessResolutionApplicationService,
  ) {}

  async evaluateAccess(
    actor: AuthenticatedAccessActor,
    query: EvaluateAccessQueryDto,
  ) {
    return this.applicationService.evaluateAccess(actor, query);
  }

  async resolveAccessContext(
    actor: AuthenticatedAccessActor,
    query: ResolveAccessContextQueryDto,
  ) {
    return this.applicationService.resolveAccessContext(actor, query);
  }

  async listEffectivePermissions(
    actor: AuthenticatedAccessActor,
    query: ListEffectivePermissionsQueryDto,
  ) {
    return this.applicationService.listEffectivePermissions(actor, query);
  }
}
```

---
## adapters/audit/noop-access-resolution-audit.adapter.ts
```ts
// adapters/audit/noop-access-resolution-audit.adapter.ts
import { Injectable } from '@nestjs/common';
import { AccessResolutionAuditPort } from '../../ports/access-resolution-audit.port';

@Injectable()
export class NoopAccessResolutionAuditAdapter implements AccessResolutionAuditPort {
  async record(): Promise<void> {
    return;
  }
}
```

---
## adapters/auth/noop-access-auth-reader.adapter.ts
```ts
// adapters/auth/noop-access-auth-reader.adapter.ts
import { Injectable } from '@nestjs/common';
import { OperationalSurface } from '@prisma/client';
import { AccessAuthReaderPort } from '../../ports/access-auth-reader.port';

@Injectable()
export class NoopAccessAuthReaderAdapter implements AccessAuthReaderPort {
  async findSessionByIdAndUserId() {
    return null;
  }

  async getActiveContext(_input: { userId: string; surface: OperationalSurface }) {
    return null;
  }
}
```

---
## adapters/events/noop-access-resolution-events.adapter.ts
```ts
// adapters/events/noop-access-resolution-events.adapter.ts
import { Injectable } from '@nestjs/common';
import { AccessResolutionEventsPort } from '../../ports/access-resolution-events.port';

@Injectable()
export class NoopAccessResolutionEventsAdapter implements AccessResolutionEventsPort {
  async publish(): Promise<void> {
    return;
  }
}
```

---
## adapters/grants/noop-access-grant-reader.adapter.ts
```ts
// adapters/grants/noop-access-grant-reader.adapter.ts
import { Injectable } from '@nestjs/common';
import { AccessGrantReaderPort } from '../../ports/access-grant-reader.port';

@Injectable()
export class NoopAccessGrantReaderAdapter implements AccessGrantReaderPort {
  async listMembershipGrants() {
    return [];
  }
}
```

---
## adapters/memberships/noop-access-membership-reader.adapter.ts
```ts
// adapters/memberships/noop-access-membership-reader.adapter.ts
import { Injectable } from '@nestjs/common';
import { AccessMembershipReaderPort } from '../../ports/access-membership-reader.port';

@Injectable()
export class NoopAccessMembershipReaderAdapter implements AccessMembershipReaderPort {
  async findAuthorizationAnchorByMembershipId() {
    return null;
  }
}
```

---
## adapters/roles/noop-access-role-reader.adapter.ts
```ts
// adapters/roles/noop-access-role-reader.adapter.ts
import { Injectable } from '@nestjs/common';
import { AccessRoleReaderPort } from '../../ports/access-role-reader.port';

@Injectable()
export class NoopAccessRoleReaderAdapter implements AccessRoleReaderPort {
  async listActiveMembershipCapabilities() {
    return [];
  }
}
```

---
## application/access-resolution.service.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/application/access-resolution.service.ts

import { Inject, Injectable } from '@nestjs/common';
import { GrantEffect, OperationalSurface } from '@prisma/client';

import { ACCESS_AUTH_READER_PORT } from '../ports/access-auth-reader.port';
import type { AccessAuthReaderPort } from '../ports/access-auth-reader.port';
import { ACCESS_MEMBERSHIP_READER_PORT } from '../ports/access-membership-reader.port';
import type { AccessMembershipReaderPort } from '../ports/access-membership-reader.port';
import { ACCESS_ROLE_READER_PORT } from '../ports/access-role-reader.port';
import type { AccessRoleReaderPort } from '../ports/access-role-reader.port';
import { ACCESS_GRANT_READER_PORT } from '../ports/access-grant-reader.port';
import type { AccessGrantReaderPort } from '../ports/access-grant-reader.port';

import { AccessResolutionSupportService } from './support/access-resolution-support.service';

import {
  ACCESS_RESOLUTION_ACTIVE_SESSION_STATUSES,
  ACCESS_RESOLUTION_VALID_MEMBERSHIP_STATUSES,
} from '../domain/constants/access-resolution.constants';
import {
  AccessContextNotResolvedError,
  AuthorizationUnresolvableError,
  InvalidAccessSessionError,
  InvalidActiveMembershipError,
  MembershipScopeMismatchError,
  SurfaceScopeConflictError,
} from '../domain/errors/access-resolution.errors';
import {
  buildCapabilityKeyFromResourceAction,
  normalizeActionKey,
  normalizeCapabilityKey,
  normalizeResourceKey,
} from '../domain/rules/access-capability-normalization.rule';
import {
  grantMatchesRequestedTarget,
  isGrantCurrentlyApplicable,
} from '../domain/rules/access-grant-applicability.rule';
import {
  hasBaselineCapability,
  resolveGrantPrecedence,
} from '../domain/rules/access-decision.rule';
import { isMembershipCompatibleWithSurface } from '../domain/rules/access-scope-compatibility.rule';
import {
  AccessDecision,
  AccessEvaluationRequest,
  ActiveAccessContext,
  AuthenticatedAccessActor,
  AuthorizationMembershipAnchor,
  MembershipApplicableGrant,
  ResolvedAccessContext,
  ResolvedAuthSession,
} from '../domain/types/access-resolution.types';

@Injectable()
export class AccessResolutionService {
  constructor(
    @Inject(ACCESS_AUTH_READER_PORT)
    private readonly authReader: AccessAuthReaderPort,
    @Inject(ACCESS_MEMBERSHIP_READER_PORT)
    private readonly membershipReader: AccessMembershipReaderPort,
    @Inject(ACCESS_ROLE_READER_PORT)
    private readonly roleReader: AccessRoleReaderPort,
    @Inject(ACCESS_GRANT_READER_PORT)
    private readonly grantReader: AccessGrantReaderPort,
    private readonly support: AccessResolutionSupportService,
  ) {}

  async evaluateAccess(
    actor: AuthenticatedAccessActor,
    query: AccessEvaluationRequest,
  ): Promise<AccessDecision> {
    const at = this.support.now();

    await this.resolveValidatedSession(actor);

    const normalizedCapabilityKey = normalizeCapabilityKey(query.capabilityKey);
    const normalizedResourceKey = normalizeResourceKey(query.resourceKey);
    const normalizedActionKey = normalizeActionKey(query.actionKey);

    const resolvedCapabilityKey =
        normalizedCapabilityKey ??
        buildCapabilityKeyFromResourceAction({
        resourceKey: normalizedResourceKey,
        actionKey: normalizedActionKey,
        });

    if (!resolvedCapabilityKey) {
        throw new AuthorizationUnresolvableError();
    }

    const membership = await this.resolveValidatedMembership(actor.userId, {
        surface: query.surface,
        membershipId: query.membershipId ?? null,
    });

    const effectivePermissions = await this.resolveEffectivePermissionsState(
        membership,
        at,
    );

    const allowed = effectivePermissions.capabilityKeys.includes(
        resolvedCapabilityKey,
    );

    const decision: AccessDecision = {
        allowed,
        reasonCode: allowed ? 'access_allowed' : 'access_denied',
        surface: query.surface,
        capabilityKey: resolvedCapabilityKey,
        resourceKey: normalizedResourceKey,
        actionKey: normalizedActionKey,
        membership,
        evaluatedAt: at,
        explanation: {
        baselineMatchedCapability:
            effectivePermissions.baselineCapabilityKeys.has(
            resolvedCapabilityKey,
            ),
        matchedAllowGrantIds:
            effectivePermissions.allowGrantIdsByCapability[
            resolvedCapabilityKey
            ] ?? [],
        matchedDenyGrantIds:
            effectivePermissions.denyGrantIdsByCapability[
            resolvedCapabilityKey
            ] ?? [],
        },
    };

    await this.support.recordEvaluation({
        actorId: actor.userId,
        membershipId: membership.membershipId,
        allowed: decision.allowed,
        reasonCode: decision.reasonCode,
        capabilityKey: decision.capabilityKey,
        resourceKey: decision.resourceKey,
        actionKey: decision.actionKey,
        at,
    });

    return decision;
  }

  async resolveAccessContext(
    actor: AuthenticatedAccessActor,
    query: {
        surface: OperationalSurface;
        membershipId?: string | null;
    },
  ): Promise<ResolvedAccessContext> {
    const at = this.support.now();

    const session = await this.resolveValidatedSession(actor);

    const activeContext = await this.resolveRawActiveContext(
        actor.userId,
        query.surface,
    );

    const membership = await this.resolveValidatedMembership(actor.userId, {
        surface: query.surface,
        membershipId: query.membershipId ?? null,
    });

    const effectivePermissions = await this.resolveEffectivePermissionsState(
        membership,
        at,
    );

    await this.support.recordContextResolved({
        actorId: actor.userId,
        membershipId: membership.membershipId,
        surface: query.surface,
        effectiveCapabilityCount: effectivePermissions.capabilityKeys.length,
        at,
    });

    return {
        session,
        activeContext,
        membership,
        effectiveCapabilityKeys: effectivePermissions.capabilityKeys,
        evaluatedAt: at,
    };
  }

  async listEffectivePermissions(
    actor: AuthenticatedAccessActor,
    query: {
        surface: OperationalSurface;
        membershipId?: string | null;
    },
  ): Promise<{
    surface: OperationalSurface;
    membership: AuthorizationMembershipAnchor;
    capabilityKeys: string[];
    evaluatedAt: Date;
  }> {
    const at = this.support.now();

    await this.resolveValidatedSession(actor);

    const membership = await this.resolveValidatedMembership(actor.userId, {
        surface: query.surface,
        membershipId: query.membershipId ?? null,
    });

    const effectivePermissions = await this.resolveEffectivePermissionsState(
        membership,
        at,
    );

    await this.support.recordEffectivePermissionsComputed({
        actorId: actor.userId,
        membershipId: membership.membershipId,
        surface: query.surface,
        capabilityCount: effectivePermissions.capabilityKeys.length,
        at,
    });

    return {
        surface: query.surface,
        membership,
        capabilityKeys: effectivePermissions.capabilityKeys,
        evaluatedAt: at,
    };
  }

  private async resolveValidatedSession(
    actor: AuthenticatedAccessActor,
  ): Promise<ResolvedAuthSession> {
    const session = await this.authReader.findSessionByIdAndUserId({
      sessionId: actor.sessionId,
      userId: actor.userId,
    });

    if (
      !session ||
      !ACCESS_RESOLUTION_ACTIVE_SESSION_STATUSES.has(session.status)
    ) {
      throw new InvalidAccessSessionError();
    }

    return session;
  }

  private async resolveValidatedMembership(
    userId: string,
    query: {
      surface: OperationalSurface;
      membershipId?: string | null;
    },
  ): Promise<AuthorizationMembershipAnchor> {
    const membership = await this.resolveMembership(userId, query);

    if (!membership) {
      throw new AccessContextNotResolvedError();
    }

    if (!ACCESS_RESOLUTION_VALID_MEMBERSHIP_STATUSES.has(membership.status)) {
      throw new InvalidActiveMembershipError();
    }

    if (
      !isMembershipCompatibleWithSurface({
        membership,
        surface: query.surface,
      })
    ) {
      throw new SurfaceScopeConflictError();
    }

    return membership;
  }

  private async resolveRawActiveContext(
    userId: string,
    surface: OperationalSurface,
  ): Promise<ActiveAccessContext | null> {
    return this.authReader.getActiveContext({
      userId,
      surface,
    });
  }

  private resolveGrantCapabilityKey(
    grant: MembershipApplicableGrant,
  ): string | null {
    const normalizedCapabilityKey = normalizeCapabilityKey(grant.capabilityKey);

    if (normalizedCapabilityKey) {
        return normalizedCapabilityKey;
    }

    return buildCapabilityKeyFromResourceAction({
        resourceKey: normalizeResourceKey(grant.resourceKey),
        actionKey: normalizeActionKey(grant.actionKey),
    });
  }

  private async resolveMembership(
    userId: string,
    query: {
      surface: OperationalSurface;
      membershipId?: string | null;
    },
  ): Promise<AuthorizationMembershipAnchor | null> {
    if (query.membershipId) {
      const membership =
        await this.membershipReader.findAuthorizationAnchorByMembershipId(
          query.membershipId,
        );

      if (!membership) {
        return null;
      }

      if (membership.userId !== userId) {
        throw new MembershipScopeMismatchError();
      }

      return membership;
    }

    const activeContext = await this.authReader.getActiveContext({
      userId,
      surface: query.surface,
    });

    if (!activeContext) {
      return null;
    }

    const membership =
      await this.membershipReader.findAuthorizationAnchorByMembershipId(
        activeContext.membershipId,
      );

    if (!membership) {
      return null;
    }

    if (membership.userId !== userId) {
      throw new MembershipScopeMismatchError();
    }

    return membership;
  }

  private async resolveEffectivePermissionsState(
    membership: AuthorizationMembershipAnchor,
    at: Date,
    ): Promise<{
    capabilityKeys: string[];
    baselineCapabilityKeys: Set<string>;
    allowGrantIdsByCapability: Record<string, string[]>;
    denyGrantIdsByCapability: Record<string, string[]>;
    }> {
    const roleCapabilities =
        await this.roleReader.listActiveMembershipCapabilities(
        membership.membershipId,
        );

    const grants = await this.grantReader.listMembershipGrants(
        membership.membershipId,
    );

    const applicableGrants = grants.filter((grant) =>
        isGrantCurrentlyApplicable(grant, at),
    );

    const baselineCapabilityKeys = new Set<string>();
    const allowCapabilityKeys = new Set<string>();
    const denyCapabilityKeys = new Set<string>();

    const allowGrantIdsByCapability: Record<string, string[]> = {};
    const denyGrantIdsByCapability: Record<string, string[]> = {};

    for (const roleCapability of roleCapabilities) {
        const normalizedCapabilityKey = normalizeCapabilityKey(
        roleCapability.capabilityKey,
        );

        if (normalizedCapabilityKey) {
        baselineCapabilityKeys.add(normalizedCapabilityKey);
        }
    }

    for (const grant of applicableGrants) {
        const resolvedGrantCapabilityKey = this.resolveGrantCapabilityKey(grant);

        if (!resolvedGrantCapabilityKey) {
        continue;
        }

        if (grant.effect === GrantEffect.ALLOW) {
        allowCapabilityKeys.add(resolvedGrantCapabilityKey);

        if (!allowGrantIdsByCapability[resolvedGrantCapabilityKey]) {
            allowGrantIdsByCapability[resolvedGrantCapabilityKey] = [];
        }

        allowGrantIdsByCapability[resolvedGrantCapabilityKey].push(grant.id);
        }

        if (grant.effect === GrantEffect.DENY) {
        denyCapabilityKeys.add(resolvedGrantCapabilityKey);

        if (!denyGrantIdsByCapability[resolvedGrantCapabilityKey]) {
            denyGrantIdsByCapability[resolvedGrantCapabilityKey] = [];
        }

        denyGrantIdsByCapability[resolvedGrantCapabilityKey].push(grant.id);
        }
    }

    const effectiveCapabilityKeys = new Set<string>(baselineCapabilityKeys);

    for (const capabilityKey of allowCapabilityKeys) {
        effectiveCapabilityKeys.add(capabilityKey);
    }

    for (const capabilityKey of denyCapabilityKeys) {
        effectiveCapabilityKeys.delete(capabilityKey);
    }

    return {
        capabilityKeys: Array.from(effectiveCapabilityKeys).sort((a, b) =>
        a.localeCompare(b),
        ),
        baselineCapabilityKeys,
        allowGrantIdsByCapability,
        denyGrantIdsByCapability,
    };
  }
}
```

---
## application/support/access-resolution-support.service.ts
```ts
import { Inject, Injectable } from '@nestjs/common';
import { OperationalSurface } from '@prisma/client';

import { ACCESS_RESOLUTION_AUDIT_PORT } from '../../ports/access-resolution-audit.port';
import type { AccessResolutionAuditPort } from '../../ports/access-resolution-audit.port';
import { ACCESS_RESOLUTION_EVENTS_PORT } from '../../ports/access-resolution-events.port';
import type { AccessResolutionEventsPort } from '../../ports/access-resolution-events.port';
import {
  ACCESS_RESOLUTION_AUDIT_ACTIONS,
} from '../../domain/constants/access-resolution.constants';
import { AccessResolutionDomainEvents } from '../../domain/events/access-resolution.events';

@Injectable()
export class AccessResolutionSupportService {
  constructor(
    @Inject(ACCESS_RESOLUTION_AUDIT_PORT)
    private readonly auditPort: AccessResolutionAuditPort,
    @Inject(ACCESS_RESOLUTION_EVENTS_PORT)
    private readonly eventsPort: AccessResolutionEventsPort,
  ) {}

  now(): Date {
    return new Date();
  }

  async recordEvaluation(input: {
    actorId: string;
    membershipId?: string | null;
    allowed: boolean;
    reasonCode: string;
    capabilityKey?: string | null;
    resourceKey?: string | null;
    actionKey?: string | null;
    at: Date;
  }): Promise<void> {
    await this.auditPort.record({
      action: ACCESS_RESOLUTION_AUDIT_ACTIONS.ACCESS_EVALUATED,
      actorId: input.actorId,
      targetId: input.membershipId ?? null,
      payload: {
        allowed: input.allowed,
        reasonCode: input.reasonCode,
        capabilityKey: input.capabilityKey ?? null,
        resourceKey: input.resourceKey ?? null,
        actionKey: input.actionKey ?? null,
      },
      at: input.at,
    });

    await this.eventsPort.publish({
      eventName: AccessResolutionDomainEvents.ACCESS_EVALUATED,
      payload: {
        actorId: input.actorId,
        membershipId: input.membershipId ?? null,
        allowed: input.allowed,
        reasonCode: input.reasonCode,
        at: input.at,
      },
    });
  }

  async recordContextResolved(input: {
    actorId: string;
    membershipId?: string | null;
    surface: OperationalSurface;
    effectiveCapabilityCount: number;
    at: Date;
  }): Promise<void> {
    await this.auditPort.record({
      action: ACCESS_RESOLUTION_AUDIT_ACTIONS.ACCESS_CONTEXT_RESOLVED,
      actorId: input.actorId,
      targetId: input.membershipId ?? null,
      payload: {
        surface: input.surface,
        effectiveCapabilityCount: input.effectiveCapabilityCount,
      },
      at: input.at,
    });

    await this.eventsPort.publish({
      eventName: AccessResolutionDomainEvents.ACCESS_CONTEXT_RESOLVED,
      payload: {
        actorId: input.actorId,
        membershipId: input.membershipId ?? null,
        surface: input.surface,
        effectiveCapabilityCount: input.effectiveCapabilityCount,
        at: input.at,
      },
    });
  }

  async recordEffectivePermissionsComputed(input: {
    actorId: string;
    membershipId: string;
    surface: OperationalSurface;
    capabilityCount: number;
    at: Date;
  }): Promise<void> {
    await this.auditPort.record({
      action: ACCESS_RESOLUTION_AUDIT_ACTIONS.EFFECTIVE_PERMISSIONS_COMPUTED,
      actorId: input.actorId,
      targetId: input.membershipId,
      payload: {
        surface: input.surface,
        capabilityCount: input.capabilityCount,
      },
      at: input.at,
    });

    await this.eventsPort.publish({
      eventName: AccessResolutionDomainEvents.EFFECTIVE_PERMISSIONS_COMPUTED,
      payload: {
        actorId: input.actorId,
        membershipId: input.membershipId,
        surface: input.surface,
        capabilityCount: input.capabilityCount,
        at: input.at,
      },
    });
  }
}
```

---
## decorators/current-access-actor.decorator.ts
```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentAccessActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return request.user ?? null;
  },
);
```

---
## domain/constants/access-resolution.constants.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/domain/constants/access-resolution.constants.ts

import { AuthSessionStatus, GrantStatus, MembershipStatus } from '@prisma/client';

export const ACCESS_CAPABILITY_KEY_MAX_LENGTH = 160;
export const ACCESS_RESOURCE_KEY_MAX_LENGTH = 191;
export const ACCESS_ACTION_KEY_MAX_LENGTH = 191;

export const ACCESS_RESOLUTION_AUDIT_ACTIONS = {
  ACCESS_EVALUATED: 'access_resolution.access_evaluated',
  ACCESS_CONTEXT_RESOLVED: 'access_resolution.context_resolved',
  EFFECTIVE_PERMISSIONS_COMPUTED:
    'access_resolution.effective_permissions_computed',
} as const;

export type AccessResolutionAuditAction =
  (typeof ACCESS_RESOLUTION_AUDIT_ACTIONS)[keyof typeof ACCESS_RESOLUTION_AUDIT_ACTIONS];

export const ACCESS_RESOLUTION_ACTIVE_SESSION_STATUSES = new Set<AuthSessionStatus>([
  AuthSessionStatus.ACTIVE,
  AuthSessionStatus.REFRESHED,
]);

export const ACCESS_RESOLUTION_VALID_MEMBERSHIP_STATUSES = new Set<MembershipStatus>([
  MembershipStatus.ACTIVE,
]);

export const ACCESS_RESOLUTION_ACTIVE_GRANT_STATUSES = new Set<GrantStatus>([
  GrantStatus.ACTIVE,
]);
```

---
## domain/errors/access-resolution.errors.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/domain/errors/access-resolution.errors.ts

import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';

export class InvalidAccessSessionError extends UnauthorizedException {
  constructor() {
    super({
      code: 'auth_session_invalid',
      message: 'auth_session_invalid',
      statusCode: 401,
    });
  }
}

export class AccessContextNotResolvedError extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'access_context_not_resolved',
      message: 'access_context_not_resolved',
      statusCode: 422,
    });
  }
}

export class InvalidActiveMembershipError extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'invalid_active_membership',
      message: 'invalid_active_membership',
      statusCode: 422,
    });
  }
}

export class MembershipScopeMismatchError extends ForbiddenException {
  constructor() {
    super({
      code: 'membership_scope_mismatch',
      message: 'membership_scope_mismatch',
      statusCode: 403,
    });
  }
}

export class SurfaceScopeConflictError extends ConflictException {
  constructor() {
    super({
      code: 'surface_scope_conflict',
      message: 'surface_scope_conflict',
      statusCode: 409,
    });
  }
}

export class AuthorizationUnresolvableError extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'authorization_unresolvable',
      message: 'authorization_unresolvable',
      statusCode: 422,
    });
  }
}
```

---
## domain/events/access-resolution.events.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/domain/events/access-resolution.events.ts

export const AccessResolutionDomainEvents = {
  ACCESS_EVALUATED: 'access_evaluated',
  ACCESS_CONTEXT_RESOLVED: 'access_context_resolved',
  EFFECTIVE_PERMISSIONS_COMPUTED: 'effective_permissions_computed',
} as const;

export type AccessResolutionDomainEvent =
  (typeof AccessResolutionDomainEvents)[keyof typeof AccessResolutionDomainEvents];
```

---
## domain/rules/access-capability-normalization.rule.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/domain/rules/access-capability-normalization.rule.ts

export function normalizeCapabilityKey(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeResourceKey(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeActionKey(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function buildCapabilityKeyFromResourceAction(input: {
  resourceKey: string | null;
  actionKey: string | null;
}): string | null {
  if (!input.resourceKey || !input.actionKey) {
    return null;
  }

  return `${input.resourceKey}.${input.actionKey}`;
}
```

---
## domain/rules/access-decision.rule.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/domain/rules/access-decision.rule.ts

import { GrantEffect } from '@prisma/client';
import {
  MembershipApplicableGrant,
  MembershipRoleCapability,
} from '../types/access-resolution.types';

export function hasBaselineCapability(
  roleCapabilities: MembershipRoleCapability[],
  capabilityKey: string | null,
): boolean {
  if (!capabilityKey) {
    return false;
  }

  return roleCapabilities.some((item) => item.capabilityKey === capabilityKey);
}

export function resolveGrantPrecedence(grants: MembershipApplicableGrant[]): {
  allowGrantIds: string[];
  denyGrantIds: string[];
  allowedByGrant: boolean;
  deniedByGrant: boolean;
} {
  const allowGrantIds = grants
    .filter((item) => item.effect === GrantEffect.ALLOW)
    .map((item) => item.id);

  const denyGrantIds = grants
    .filter((item) => item.effect === GrantEffect.DENY)
    .map((item) => item.id);

  return {
    allowGrantIds,
    denyGrantIds,
    allowedByGrant: allowGrantIds.length > 0,
    deniedByGrant: denyGrantIds.length > 0,
  };
}
```

---
## domain/rules/access-grant-applicability.rule.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/domain/rules/access-grant-applicability.rule.ts

import { GrantTargetType } from '@prisma/client';
import { MembershipApplicableGrant } from '../types/access-resolution.types';
import { ACCESS_RESOLUTION_ACTIVE_GRANT_STATUSES } from '../constants/access-resolution.constants';

export function isGrantCurrentlyApplicable(
  grant: MembershipApplicableGrant,
  at: Date,
): boolean {
  if (!ACCESS_RESOLUTION_ACTIVE_GRANT_STATUSES.has(grant.status)) {
    return false;
  }

  if (grant.validFrom && grant.validFrom > at) {
    return false;
  }

  if (grant.validUntil && grant.validUntil < at) {
    return false;
  }

  return true;
}

export function grantMatchesRequestedTarget(
  grant: MembershipApplicableGrant,
  input: {
    capabilityKey: string | null;
    resourceKey: string | null;
    actionKey: string | null;
  },
): boolean {
  if (grant.targetType === GrantTargetType.CAPABILITY) {
    return grant.capabilityKey === input.capabilityKey;
  }

  return (
    grant.targetType === GrantTargetType.RESOURCE_ACTION &&
    grant.resourceKey === input.resourceKey &&
    grant.actionKey === input.actionKey
  );
}
```

---
## domain/rules/access-scope-compatibility.rule.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/domain/rules/access-scope-compatibility.rule.ts

import { MembershipScopeType, OperationalSurface } from '@prisma/client';
import { AuthorizationMembershipAnchor } from '../types/access-resolution.types';

export function isMembershipCompatibleWithSurface(input: {
  membership: AuthorizationMembershipAnchor;
  surface: OperationalSurface;
}): boolean {
  const { membership, surface } = input;

  switch (surface) {
    case OperationalSurface.PARTNERS_WEB:
      return (
        membership.scopeType === MembershipScopeType.TENANT ||
        membership.scopeType === MembershipScopeType.STORE
      );
    default:
      return false;
  }
}
```

---
## domain/types/access-resolution.types.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/domain/types/access-resolution.types.ts

import {
  AuthProvider,
  AuthSessionStatus,
  GrantEffect,
  GrantStatus,
  GrantTargetType,
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
  RoleAssignmentStatus,
  RoleScopeType,
} from '@prisma/client';

export interface AuthenticatedAccessActor {
  userId: string;
  sessionId: string;
  authIdentityId?: string | null;
  provider?: AuthProvider | null;
  isPlatformAdmin?: boolean;
}

export interface AccessEvaluationRequest {
  surface: OperationalSurface;
  capabilityKey?: string | null;
  resourceKey?: string | null;
  actionKey?: string | null;
  membershipId?: string | null;
}

export interface ResolvedAuthSession {
  sessionId: string;
  userId: string;
  status: AuthSessionStatus;
}

export interface AuthorizationMembershipAnchor {
  membershipId: string;
  userId: string;
  scopeType: MembershipScopeType;
  tenantId: string;
  storeId: string | null;
  status: MembershipStatus;
}

export interface ActiveAccessContext {
  userId: string;
  membershipId: string;
  surface: OperationalSurface;
  scopeType: MembershipScopeType;
  tenantId: string;
  storeId: string | null;
  status: MembershipStatus;
  updatedAt: Date;
}

export interface MembershipRoleCapability {
  roleAssignmentId: string;
  roleId: string;
  roleKey: string;
  roleScopeType: RoleScopeType;
  assignmentStatus: RoleAssignmentStatus;
  capabilityKey: string;
}

export interface MembershipApplicableGrant {
  id: string;
  membershipId: string;
  effect: GrantEffect;
  targetType: GrantTargetType;
  capabilityKey: string | null;
  resourceKey: string | null;
  actionKey: string | null;
  status: GrantStatus;
  validFrom: Date | null;
  validUntil: Date | null;
}

export type AccessReasonCode =
  | 'access_allowed'
  | 'auth_session_invalid'
  | 'access_context_not_resolved'
  | 'invalid_active_membership'
  | 'membership_scope_mismatch'
  | 'surface_scope_conflict'
  | 'authorization_unresolvable'
  | 'access_denied';

export interface AccessDecision {
  allowed: boolean;
  reasonCode: AccessReasonCode;
  surface: OperationalSurface;
  capabilityKey: string | null;
  resourceKey: string | null;
  actionKey: string | null;
  membership: AuthorizationMembershipAnchor | null;
  evaluatedAt: Date;
  explanation: {
    baselineMatchedCapability: boolean;
    matchedAllowGrantIds: string[];
    matchedDenyGrantIds: string[];
  };
}

export interface ResolvedAccessContext {
  session: ResolvedAuthSession;
  activeContext: ActiveAccessContext | null;
  membership: AuthorizationMembershipAnchor | null;
  effectiveCapabilityKeys: string[];
  evaluatedAt: Date;
}

export interface EffectivePermissionsResult {
  surface: OperationalSurface;
  membership: AuthorizationMembershipAnchor;
  capabilityKeys: string[];
  evaluatedAt: Date;
}
```

---
## dto/queries/evaluate-access.query.dto.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/dto/queries/evaluate-access.query.dto.ts

import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { OperationalSurface } from '@prisma/client';
import {
  ACCESS_ACTION_KEY_MAX_LENGTH,
  ACCESS_CAPABILITY_KEY_MAX_LENGTH,
  ACCESS_RESOURCE_KEY_MAX_LENGTH,
} from '../../domain/constants/access-resolution.constants';

export class EvaluateAccessQueryDto {
  @IsEnum(OperationalSurface)
  surface!: OperationalSurface;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  membershipId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(ACCESS_CAPABILITY_KEY_MAX_LENGTH)
  capabilityKey?: string;

  @ValidateIf((o) => !o.capabilityKey)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(ACCESS_RESOURCE_KEY_MAX_LENGTH)
  resourceKey?: string;

  @ValidateIf((o) => !o.capabilityKey)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(ACCESS_ACTION_KEY_MAX_LENGTH)
  actionKey?: string;
}
```

---
## dto/queries/list-effective-permissions.query.dto.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/dto/queries/list-effective-permissions.query.dto.ts

import { OperationalSurface } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListEffectivePermissionsQueryDto {
  @IsEnum(OperationalSurface)
  surface!: OperationalSurface;

  @IsOptional()
  @IsString()
  membershipId?: string;
}
```

---
## dto/queries/resolve-access-context.query.dto.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/dto/queries/resolve-access-context.query.dto.ts

import { OperationalSurface } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ResolveAccessContextQueryDto {
  @IsEnum(OperationalSurface)
  surface!: OperationalSurface;

  @IsOptional()
  @IsString()
  membershipId?: string;
}
```

---
## dto/responses/access-context.response.dto.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/dto/responses/access-context.response.dto.ts

import {
  AuthSessionStatus,
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
} from '@prisma/client';

export class AccessContextResponseDto {
  session!: {
    sessionId: string;
    userId: string;
    status: AuthSessionStatus;
  };

  activeContext!: {
    membershipId: string;
    surface: OperationalSurface;
    scopeType: MembershipScopeType;
    tenantId: string;
    storeId: string | null;
    status: MembershipStatus;
    updatedAt: Date;
  } | null;

  membership!: {
    membershipId: string;
    scopeType: MembershipScopeType;
    tenantId: string;
    storeId: string | null;
    status: MembershipStatus;
  } | null;

  effectiveCapabilityKeys!: string[];
  evaluatedAt!: Date;
}
```

---
## dto/responses/access-decision.response.dto.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/dto/responses/access-decision.response.dto.ts

import { MembershipScopeType, OperationalSurface } from '@prisma/client';
import { AccessReasonCode } from '../../domain/types/access-resolution.types';

export class AccessDecisionResponseDto {
  allowed!: boolean;
  reasonCode!: AccessReasonCode;

  surface!: OperationalSurface;

  capabilityKey!: string | null;
  resourceKey!: string | null;
  actionKey!: string | null;

  membership!: {
    membershipId: string;
    scopeType: MembershipScopeType;
    tenantId: string;
    storeId: string | null;
  } | null;

  explanation!: {
    baselineMatchedCapability: boolean;
    matchedAllowGrantIds: string[];
    matchedDenyGrantIds: string[];
  };

  evaluatedAt!: Date;
}
```

---
## dto/responses/effective-permission.response.dto.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/dto/responses/effective-permission.response.dto.ts

import { MembershipScopeType, OperationalSurface } from '@prisma/client';

export class EffectivePermissionResponseDto {
  surface!: OperationalSurface;

  membership!: {
    membershipId: string;
    scopeType: MembershipScopeType;
    tenantId: string;
    storeId: string | null;
  };

  capabilityKeys!: string[];

  evaluatedAt!: Date;
}
```

---
## guards/access-resolution-authenticated.guard.ts
```ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AccessResolutionAuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const actor = request.user;

    if (!actor?.userId || !actor?.sessionId) {
      throw new UnauthorizedException('auth_session_invalid');
    }

    return true;
  }
}
```

---
## mappers/access-context.mapper.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/mappers/access-context.mapper.ts

import { Injectable } from '@nestjs/common';
import { ResolvedAccessContext } from '../domain/types/access-resolution.types';
import { AccessContextResponseDto } from '../dto/responses/access-context.response.dto';

@Injectable()
export class AccessContextMapper {
  toResponse(input: ResolvedAccessContext): AccessContextResponseDto {
    return {
      session: {
        sessionId: input.session.sessionId,
        userId: input.session.userId,
        status: input.session.status,
      },
      activeContext: input.activeContext
        ? {
            membershipId: input.activeContext.membershipId,
            surface: input.activeContext.surface,
            scopeType: input.activeContext.scopeType,
            tenantId: input.activeContext.tenantId,
            storeId: input.activeContext.storeId,
            status: input.activeContext.status,
            updatedAt: input.activeContext.updatedAt,
          }
        : null,
      membership: input.membership
        ? {
            membershipId: input.membership.membershipId,
            scopeType: input.membership.scopeType,
            tenantId: input.membership.tenantId,
            storeId: input.membership.storeId,
            status: input.membership.status,
          }
        : null,
      effectiveCapabilityKeys: input.effectiveCapabilityKeys,
      evaluatedAt: input.evaluatedAt,
    };
  }
}
```

---
## mappers/access-decision.mapper.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/mappers/access-decision.mapper.ts

import { Injectable } from '@nestjs/common';
import { AccessDecision } from '../domain/types/access-resolution.types';
import { AccessDecisionResponseDto } from '../dto/responses/access-decision.response.dto';

@Injectable()
export class AccessDecisionMapper {
  toResponse(input: AccessDecision): AccessDecisionResponseDto {
    return {
      allowed: input.allowed,
      reasonCode: input.reasonCode,
      surface: input.surface,
      capabilityKey: input.capabilityKey,
      resourceKey: input.resourceKey,
      actionKey: input.actionKey,
      membership: input.membership
        ? {
            membershipId: input.membership.membershipId,
            scopeType: input.membership.scopeType,
            tenantId: input.membership.tenantId,
            storeId: input.membership.storeId,
          }
        : null,
      explanation: input.explanation,
      evaluatedAt: input.evaluatedAt,
    };
  }
}
```

---
## mappers/effective-permission.mapper.ts
```ts
// packages/api/src/modules/01-identity-and-access/07-access-resolution/mappers/effective-permission.mapper.ts

import { Injectable } from '@nestjs/common';
import { EffectivePermissionResponseDto } from '../dto/responses/effective-permission.response.dto';
import { AuthorizationMembershipAnchor } from '../domain/types/access-resolution.types';
import { OperationalSurface } from '@prisma/client';

@Injectable()
export class EffectivePermissionMapper {
  toResponse(input: {
    surface: OperationalSurface;
    membership: AuthorizationMembershipAnchor;
    capabilityKeys: string[];
    evaluatedAt: Date;
  }): EffectivePermissionResponseDto {
    return {
      surface: input.surface,
      membership: {
        membershipId: input.membership.membershipId,
        scopeType: input.membership.scopeType,
        tenantId: input.membership.tenantId,
        storeId: input.membership.storeId,
      },
      capabilityKeys: input.capabilityKeys,
      evaluatedAt: input.evaluatedAt,
    };
  }
}
```

---
## ports/access-auth-reader.port.ts
```ts
import { OperationalSurface } from '@prisma/client';
import {
  ActiveAccessContext,
  ResolvedAuthSession,
} from '../domain/types/access-resolution.types';

export const ACCESS_AUTH_READER_PORT = Symbol('ACCESS_AUTH_READER_PORT');

export interface AccessAuthReaderPort {
  findSessionByIdAndUserId(input: {
    sessionId: string;
    userId: string;
  }): Promise<ResolvedAuthSession | null>;

  getActiveContext(input: {
    userId: string;
    surface: OperationalSurface;
  }): Promise<ActiveAccessContext | null>;
}
```

---
## ports/access-grant-reader.port.ts
```ts
import { MembershipApplicableGrant } from '../domain/types/access-resolution.types';

export const ACCESS_GRANT_READER_PORT = Symbol('ACCESS_GRANT_READER_PORT');

export interface AccessGrantReaderPort {
  listMembershipGrants(membershipId: string): Promise<MembershipApplicableGrant[]>;
}
```

---
## ports/access-membership-reader.port.ts
```ts
import { AuthorizationMembershipAnchor } from '../domain/types/access-resolution.types';

export const ACCESS_MEMBERSHIP_READER_PORT = Symbol('ACCESS_MEMBERSHIP_READER_PORT');

export interface AccessMembershipReaderPort {
  findAuthorizationAnchorByMembershipId(
    membershipId: string,
  ): Promise<AuthorizationMembershipAnchor | null>;
}
```

---
## ports/access-resolution-audit.port.ts
```ts
import type { AccessResolutionAuditAction } from '../domain/constants/access-resolution.constants';

export const ACCESS_RESOLUTION_AUDIT_PORT = Symbol('ACCESS_RESOLUTION_AUDIT_PORT');

export interface AccessResolutionAuditPort {
  record(input: {
    action: AccessResolutionAuditAction;
    actorId?: string | null;
    targetId?: string | null;
    payload?: Record<string, unknown>;
    at?: Date;
  }): Promise<void>;
}
```

---
## ports/access-resolution-events.port.ts
```ts
import type { AccessResolutionDomainEvent } from '../domain/events/access-resolution.events';

export const ACCESS_RESOLUTION_EVENTS_PORT = Symbol('ACCESS_RESOLUTION_EVENTS_PORT');

export interface AccessResolutionEventsPort {
  publish(input: {
    eventName: AccessResolutionDomainEvent;
    payload: Record<string, unknown>;
  }): Promise<void>;
}
```

---
## ports/access-role-reader.port.ts
```ts
import { MembershipRoleCapability } from '../domain/types/access-resolution.types';

export const ACCESS_ROLE_READER_PORT = Symbol('ACCESS_ROLE_READER_PORT');

export interface AccessRoleReaderPort {
  listActiveMembershipCapabilities(
    membershipId: string,
  ): Promise<MembershipRoleCapability[]>;
}
```

