import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { GrantEffect, GrantStatus, GrantTargetType } from '@prisma/client';

import { GrantsController } from '../grants.controller';
import { GrantsService } from '../grants.service';
import { GrantResponseMapper } from '../mappers/grant-response.mapper';
import { GrantPlatformAdminGuard } from '../guards/grant-platform-admin.guard';
import { GrantAccessPolicy } from '../policies/grant-access.policy';

describe('GrantsController (e2e)', () => {
  let app: INestApplication;

  const grantsService = {
    createGrant: jest.fn(),
    listGrants: jest.fn(),
    getGrantById: jest.fn(),
    revokeGrant: jest.fn(),
    listMembershipGrants: jest.fn(),
  };

  const grantAccessPolicy = {
    canManageGrants: jest.fn(),
  };

  const grantFixture = {
    id: 'cgrant12345678901234567890',
    membershipId: 'cmembership1234567890123456',
    effect: GrantEffect.ALLOW,
    targetType: GrantTargetType.CAPABILITY,
    capabilityKey: 'orders.read',
    resourceKey: null,
    actionKey: null,
    status: GrantStatus.ACTIVE,
    validFrom: null,
    validUntil: null,
    creationReason: 'manual grant',
    revocationReason: null,
    createdBy: 'admin_1',
    revokedBy: null,
    activatedAt: new Date('2026-04-15T12:00:00.000Z'),
    expiredAt: null,
    revokedAt: null,
    version: 1,
    createdAt: new Date('2026-04-15T12:00:00.000Z'),
    updatedAt: new Date('2026-04-15T12:00:00.000Z'),
  };

  async function buildApp() {
    const moduleRef = await Test.createTestingModule({
      controllers: [GrantsController],
      providers: [
        GrantResponseMapper,
        GrantPlatformAdminGuard,
        { provide: GrantsService, useValue: grantsService },
        { provide: GrantAccessPolicy, useValue: grantAccessPolicy },
      ],
    }).compile();

    const nestApp = moduleRef.createNestApplication();
    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await nestApp.init();
    return nestApp;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('POST /v1/grants is protected by guard', async () => {
    grantAccessPolicy.canManageGrants.mockReturnValue(false);
    app = await buildApp();

    await request(app.getHttpServer())
      .post('/v1/grants')
      .send({
        membershipId: 'cmembership1234567890123456',
        effect: GrantEffect.ALLOW,
        targetType: GrantTargetType.CAPABILITY,
        capabilityKey: 'orders.read',
      })
      .expect(403);
  });

  it('POST /v1/grants creates grant for admin actor', async () => {
    grantAccessPolicy.canManageGrants.mockReturnValue(true);
    grantsService.createGrant.mockResolvedValue(grantFixture);
    app = await buildApp();

    const response = await request(app.getHttpServer())
      .post('/v1/grants')
      .set('Content-Type', 'application/json')
      .send({
        membershipId: 'cmembership1234567890123456',
        effect: GrantEffect.ALLOW,
        targetType: GrantTargetType.CAPABILITY,
        capabilityKey: 'orders.read',
      })
      .expect(201);

    expect(grantsService.createGrant).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        membershipId: 'cmembership1234567890123456',
        effect: GrantEffect.ALLOW,
        targetType: GrantTargetType.CAPABILITY,
        capabilityKey: 'orders.read',
      }),
    );

    expect(response.body).toEqual(
      expect.objectContaining({
        id: grantFixture.id,
        membershipId: grantFixture.membershipId,
        effect: GrantEffect.ALLOW,
        targetType: GrantTargetType.CAPABILITY,
        capabilityKey: 'orders.read',
      }),
    );
  });

  it('GET /v1/grants is protected by guard', async () => {
    grantAccessPolicy.canManageGrants.mockReturnValue(false);
    app = await buildApp();

    await request(app.getHttpServer()).get('/v1/grants').expect(403);
  });

  it('GET /v1/grants returns mapped summaries', async () => {
    grantAccessPolicy.canManageGrants.mockReturnValue(true);
    grantsService.listGrants.mockResolvedValue([grantFixture]);
    app = await buildApp();

    const response = await request(app.getHttpServer())
      .get('/v1/grants')
      .expect(200);

    expect(grantsService.listGrants).toHaveBeenCalled();
    expect(response.body).toEqual([
      expect.objectContaining({
        id: grantFixture.id,
        membershipId: grantFixture.membershipId,
        effect: GrantEffect.ALLOW,
        targetType: GrantTargetType.CAPABILITY,
      }),
    ]);
  });

  it('GET /v1/grants/:grantId returns mapped grant', async () => {
    grantAccessPolicy.canManageGrants.mockReturnValue(true);
    grantsService.getGrantById.mockResolvedValue(grantFixture);
    app = await buildApp();

    const response = await request(app.getHttpServer())
      .get(`/v1/grants/${grantFixture.id}`)
      .expect(200);

    expect(grantsService.getGrantById).toHaveBeenCalledWith(grantFixture.id);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: grantFixture.id,
        membershipId: grantFixture.membershipId,
        creationReason: grantFixture.creationReason,
      }),
    );
  });

  it('PATCH /v1/grants/:grantId/revoke is protected by guard', async () => {
    grantAccessPolicy.canManageGrants.mockReturnValue(false);
    app = await buildApp();

    await request(app.getHttpServer())
      .patch(`/v1/grants/${grantFixture.id}/revoke`)
      .send({ reason: 'manual revoke' })
      .expect(403);
  });

  it('PATCH /v1/grants/:grantId/revoke delegates to service', async () => {
    grantAccessPolicy.canManageGrants.mockReturnValue(true);
    grantsService.revokeGrant.mockResolvedValue({
      id: grantFixture.id,
      status: GrantStatus.REVOKED,
      revokedAt: '2026-04-15T12:00:00.000Z',
    });
    app = await buildApp();

    const response = await request(app.getHttpServer())
      .patch(`/v1/grants/${grantFixture.id}/revoke`)
      .send({ reason: 'manual revoke' })
      .expect(200);

    expect(grantsService.revokeGrant).toHaveBeenCalledWith(
      null,
      grantFixture.id,
      expect.objectContaining({ reason: 'manual revoke' }),
    );

    expect(response.body).toEqual(
      expect.objectContaining({
        id: grantFixture.id,
        status: GrantStatus.REVOKED,
      }),
    );
  });

  it('GET /v1/grants/memberships/:membershipId returns mapped summaries', async () => {
    grantAccessPolicy.canManageGrants.mockReturnValue(true);
    grantsService.listMembershipGrants.mockResolvedValue([grantFixture]);
    app = await buildApp();

    const response = await request(app.getHttpServer())
      .get(`/v1/grants/memberships/${grantFixture.membershipId}`)
      .expect(200);

    expect(grantsService.listMembershipGrants).toHaveBeenCalledWith(
      grantFixture.membershipId,
    );

    expect(response.body).toEqual([
      expect.objectContaining({
        id: grantFixture.id,
        membershipId: grantFixture.membershipId,
      }),
    ]);
  });
});