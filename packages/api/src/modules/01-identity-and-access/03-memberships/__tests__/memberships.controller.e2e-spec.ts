// packages/api/src/modules/01-identity-and-access/03-memberships/__tests__/memberships.controller.e2e-spec.ts

import {
  INestApplication,
  CanActivate,
  ExecutionContext,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  MembershipScopeType,
  MembershipStatus,
  OperationalSurface,
} from '@prisma/client';

import { MembershipsController } from '../memberships.controller';
import { MembershipsService } from '../memberships.service';
import { MembershipResponseMapper } from '../mappers/membership-response.mapper';

import { MembershipPlatformAdminGuard } from '../guards/membership-platform-admin.guard';
import { MembershipSelfOrPlatformAdminGuard } from '../guards/membership-self-or-platform-admin.guard';

const ACTOR_ID = 'ckm5xj8x40000a1b2c3d4e5f6';
const USER_ID = 'ckm5xj8x40001a1b2c3d4e5f6';
const TENANT_ID = 'ckm5xj8x40002a1b2c3d4e5f6';
const STORE_ID = 'ckm5xj8x40003a1b2c3d4e5f6';
const MEMBERSHIP_ID = 'ckm5xj8x40004a1b2c3d4e5f6';
const OTHER_USER_ID = 'ckm5xj8x40005a1b2c3d4e5f6';

class AllowGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = {
      userId: ACTOR_ID,
      isPlatformAdmin: true,
    };
    return true;
  }
}

describe('MembershipsController (e2e)', () => {
  let app: INestApplication;

  const membershipsService = {
    createMembership: jest.fn(),
    getMembershipById: jest.fn(),
    listMemberships: jest.fn(),
    listCurrentUserMemberships: jest.fn(),
    activateMembership: jest.fn(),
    suspendMembership: jest.fn(),
    revokeMembership: jest.fn(),
    expireMembership: jest.fn(),
    setActiveMembershipContext: jest.fn(),
    getActiveMembershipContext: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [MembershipsController],
      providers: [
        MembershipResponseMapper,
        {
          provide: MembershipsService,
          useValue: membershipsService,
        },
      ],
    })
      .overrideGuard(MembershipPlatformAdminGuard)
      .useValue(new AllowGuard())
      .overrideGuard(MembershipSelfOrPlatformAdminGuard)
      .useValue(new AllowGuard())
      .compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /v1/memberships creates a membership', async () => {
    membershipsService.createMembership.mockResolvedValue({
      id: MEMBERSHIP_ID,
      userId: USER_ID,
      scopeType: MembershipScopeType.TENANT,
      tenantId: TENANT_ID,
      storeId: null,
      status: MembershipStatus.PENDING,
      effectiveFrom: null,
      expiresAt: null,
      createdAt: '2026-04-10T20:00:00.000Z',
      updatedAt: '2026-04-10T20:00:00.000Z',
      invitationId: null,
      activatedAt: null,
      suspendedAt: null,
      revokedAt: null,
      expiredAt: null,
      reason: 'initial setup',
      version: 1,
    });

    const response = await request(app.getHttpServer())
      .post('/v1/memberships')
      .send({
        userId: USER_ID,
        scopeType: MembershipScopeType.TENANT,
        tenantId: TENANT_ID,
        reason: 'initial setup',
      })
      .expect(201);

    expect(membershipsService.createMembership).toHaveBeenCalledWith(
      ACTOR_ID,
      expect.objectContaining({
        userId: USER_ID,
        scopeType: MembershipScopeType.TENANT,
        tenantId: TENANT_ID,
      }),
    );

    expect(response.body).toEqual(
      expect.objectContaining({
        id: MEMBERSHIP_ID,
        userId: USER_ID,
        scopeType: MembershipScopeType.TENANT,
        tenantId: TENANT_ID,
        status: MembershipStatus.PENDING,
        version: 1,
      }),
    );
  });

  it('GET /v1/memberships/:id returns membership detail', async () => {
    membershipsService.getMembershipById.mockResolvedValue({
      id: MEMBERSHIP_ID,
      userId: USER_ID,
      scopeType: MembershipScopeType.STORE,
      tenantId: TENANT_ID,
      storeId: STORE_ID,
      status: MembershipStatus.ACTIVE,
      effectiveFrom: null,
      expiresAt: null,
      createdAt: '2026-04-10T20:00:00.000Z',
      updatedAt: '2026-04-10T20:00:00.000Z',
      invitationId: null,
      activatedAt: '2026-04-10T20:05:00.000Z',
      suspendedAt: null,
      revokedAt: null,
      expiredAt: null,
      reason: null,
      version: 2,
    });

    const response = await request(app.getHttpServer())
      .get(`/v1/memberships/${MEMBERSHIP_ID}`)
      .expect(200);

    expect(membershipsService.getMembershipById).toHaveBeenCalledWith({
      id: MEMBERSHIP_ID,
    });

    expect(response.body).toEqual(
      expect.objectContaining({
        id: MEMBERSHIP_ID,
        scopeType: MembershipScopeType.STORE,
        tenantId: TENANT_ID,
        storeId: STORE_ID,
        status: MembershipStatus.ACTIVE,
      }),
    );
  });

  it('GET /v1/memberships returns paginated list', async () => {
    membershipsService.listMemberships.mockResolvedValue({
      items: [
        {
          id: MEMBERSHIP_ID,
          userId: USER_ID,
          scopeType: MembershipScopeType.TENANT,
          tenantId: TENANT_ID,
          storeId: null,
          status: MembershipStatus.PENDING,
          effectiveFrom: null,
          expiresAt: null,
          createdAt: '2026-04-10T20:00:00.000Z',
          updatedAt: '2026-04-10T20:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    const response = await request(app.getHttpServer())
      .get('/v1/memberships')
      .expect(200);

    expect(membershipsService.listMemberships).toHaveBeenCalled();

    expect(response.body).toEqual({
      items: [
        expect.objectContaining({
          id: MEMBERSHIP_ID,
          userId: USER_ID,
          scopeType: MembershipScopeType.TENANT,
          tenantId: TENANT_ID,
          status: MembershipStatus.PENDING,
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it('GET /v1/memberships/me returns current user memberships', async () => {
    membershipsService.listCurrentUserMemberships.mockResolvedValue({
      items: [
        {
          id: MEMBERSHIP_ID,
          userId: ACTOR_ID,
          scopeType: MembershipScopeType.STORE,
          tenantId: TENANT_ID,
          storeId: STORE_ID,
          status: MembershipStatus.ACTIVE,
          effectiveFrom: null,
          expiresAt: null,
          createdAt: '2026-04-10T20:00:00.000Z',
          updatedAt: '2026-04-10T20:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    const response = await request(app.getHttpServer())
      .get('/v1/memberships/me')
      .expect(200);

    expect(membershipsService.listCurrentUserMemberships).toHaveBeenCalledWith(
      ACTOR_ID,
      expect.any(Object),
    );

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toEqual(
      expect.objectContaining({
        id: MEMBERSHIP_ID,
        userId: ACTOR_ID,
        scopeType: MembershipScopeType.STORE,
        tenantId: TENANT_ID,
        storeId: STORE_ID,
        status: MembershipStatus.ACTIVE,
      }),
    );
  });

  it('POST /v1/memberships/:id/activate activates membership', async () => {
    membershipsService.activateMembership.mockResolvedValue({
      id: MEMBERSHIP_ID,
      userId: USER_ID,
      scopeType: MembershipScopeType.TENANT,
      tenantId: TENANT_ID,
      storeId: null,
      status: MembershipStatus.ACTIVE,
      effectiveFrom: null,
      expiresAt: null,
      createdAt: '2026-04-10T20:00:00.000Z',
      updatedAt: '2026-04-10T20:10:00.000Z',
      invitationId: null,
      activatedAt: '2026-04-10T20:10:00.000Z',
      suspendedAt: null,
      revokedAt: null,
      expiredAt: null,
      reason: 'approved',
      version: 2,
    });

    const response = await request(app.getHttpServer())
      .post(`/v1/memberships/${MEMBERSHIP_ID}/activate`)
      .send({ reason: 'approved' })
      .expect(201);

    expect(membershipsService.activateMembership).toHaveBeenCalledWith(
      ACTOR_ID,
      MEMBERSHIP_ID,
      expect.objectContaining({
        reason: 'approved',
      }),
    );

    expect(response.body).toEqual(
      expect.objectContaining({
        id: MEMBERSHIP_ID,
        status: MembershipStatus.ACTIVE,
      }),
    );
  });

  it('PUT /v1/memberships/me/active-context sets active context', async () => {
    membershipsService.setActiveMembershipContext.mockResolvedValue({
      membershipId: MEMBERSHIP_ID,
      userId: ACTOR_ID,
      surface: OperationalSurface.PARTNERS_WEB,
      scopeType: MembershipScopeType.STORE,
      tenantId: TENANT_ID,
      storeId: STORE_ID,
      status: MembershipStatus.ACTIVE,
      updatedAt: '2026-04-10T21:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .put('/v1/memberships/me/active-context')
      .send({
        membershipId: MEMBERSHIP_ID,
        surface: OperationalSurface.PARTNERS_WEB,
      })
      .expect(200);

    expect(membershipsService.setActiveMembershipContext).toHaveBeenCalledWith(
      ACTOR_ID,
      expect.objectContaining({
        membershipId: MEMBERSHIP_ID,
        surface: OperationalSurface.PARTNERS_WEB,
      }),
    );

    expect(response.body).toEqual(
      expect.objectContaining({
        membershipId: MEMBERSHIP_ID,
        userId: ACTOR_ID,
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.STORE,
        tenantId: TENANT_ID,
        storeId: STORE_ID,
        status: MembershipStatus.ACTIVE,
      }),
    );
  });

  it('GET /v1/memberships/me/active-context returns current active context', async () => {
    membershipsService.getActiveMembershipContext.mockResolvedValue({
      membershipId: MEMBERSHIP_ID,
      userId: ACTOR_ID,
      surface: OperationalSurface.PARTNERS_WEB,
      scopeType: MembershipScopeType.TENANT,
      tenantId: TENANT_ID,
      storeId: null,
      status: MembershipStatus.ACTIVE,
      updatedAt: '2026-04-10T21:05:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .get('/v1/memberships/me/active-context')
      .query({ surface: OperationalSurface.PARTNERS_WEB })
      .expect(200);

    expect(membershipsService.getActiveMembershipContext).toHaveBeenCalledWith(
      ACTOR_ID,
      OperationalSurface.PARTNERS_WEB,
    );

    expect(response.body).toEqual(
      expect.objectContaining({
        membershipId: MEMBERSHIP_ID,
        userId: ACTOR_ID,
        surface: OperationalSurface.PARTNERS_WEB,
        scopeType: MembershipScopeType.TENANT,
        tenantId: TENANT_ID,
        storeId: null,
        status: MembershipStatus.ACTIVE,
      }),
    );
  });

  it('GET /v1/memberships/me/active-context returns null when no active context exists', async () => {
    membershipsService.getActiveMembershipContext.mockResolvedValue(null);

    const response = await request(app.getHttpServer())
      .get('/v1/memberships/me/active-context')
      .query({ surface: OperationalSurface.PARTNERS_WEB })
      .expect(200);

    expect(response.body).toEqual({});
  });

  it('GET /v1/memberships/me resolves actor from request user, not from query userId', async () => {
    membershipsService.listCurrentUserMemberships.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    await request(app.getHttpServer())
      .get('/v1/memberships/me')
      .query({ userId: OTHER_USER_ID })
      .expect(200);

    expect(membershipsService.listCurrentUserMemberships).toHaveBeenCalledWith(
      ACTOR_ID,
      expect.any(Object),
    );
  });

  it('PUT /v1/memberships/me/active-context resolves actor from request user, not from body', async () => {
    membershipsService.setActiveMembershipContext.mockResolvedValue({
      membershipId: MEMBERSHIP_ID,
      userId: ACTOR_ID,
      surface: OperationalSurface.PARTNERS_WEB,
      scopeType: MembershipScopeType.STORE,
      tenantId: TENANT_ID,
      storeId: STORE_ID,
      status: MembershipStatus.ACTIVE,
      updatedAt: '2026-04-10T21:00:00.000Z',
    });

    await request(app.getHttpServer())
      .put('/v1/memberships/me/active-context')
      .send({
        userId: OTHER_USER_ID,
        membershipId: MEMBERSHIP_ID,
        surface: OperationalSurface.PARTNERS_WEB,
      })
      .expect(200);

    expect(membershipsService.setActiveMembershipContext).toHaveBeenCalledWith(
      ACTOR_ID,
      expect.objectContaining({
        membershipId: MEMBERSHIP_ID,
        surface: OperationalSurface.PARTNERS_WEB,
      }),
    );
  });

  it('GET /v1/memberships forwards filters, pagination and sorting', async () => {
    membershipsService.listMemberships.mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      pageSize: 10,
    });

    await request(app.getHttpServer())
      .get('/v1/memberships')
      .query({
        userId: OTHER_USER_ID,
        scopeType: MembershipScopeType.STORE,
        tenantId: TENANT_ID,
        storeId: STORE_ID,
        status: MembershipStatus.ACTIVE,
        page: 2,
        pageSize: 10,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      })
      .expect(200);

    expect(membershipsService.listMemberships).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: OTHER_USER_ID,
        scopeType: MembershipScopeType.STORE,
        tenantId: TENANT_ID,
        storeId: STORE_ID,
        status: MembershipStatus.ACTIVE,
        page: 2,
        pageSize: 10,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      }),
    );
  });

  it('GET /v1/memberships/me resolves actor from request and does not trust external userId', async () => {
    membershipsService.listCurrentUserMemberships.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    await request(app.getHttpServer())
      .get('/v1/memberships/me')
      .query({
        userId: OTHER_USER_ID,
        status: MembershipStatus.ACTIVE,
        page: 1,
        pageSize: 20,
      })
      .expect(200);

    expect(membershipsService.listCurrentUserMemberships).toHaveBeenCalledWith(
      ACTOR_ID,
      expect.objectContaining({
        status: MembershipStatus.ACTIVE,
        page: 1,
        pageSize: 20,
      }),
    );
  });
  
  it('GET /v1/memberships returns 400 when page is invalid', async () => {
    await request(app.getHttpServer())
      .get('/v1/memberships')
      .query({
        page: 0,
      })
      .expect(400);
  });

  it('GET /v1/memberships returns 400 when sortDirection is invalid', async () => {
    await request(app.getHttpServer())
      .get('/v1/memberships')
      .query({
        sortDirection: 'sideways',
      })
      .expect(400);
  });
});