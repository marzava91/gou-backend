import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  InvitationRecipientType,
  InvitationStatus,
  MembershipScopeType,
} from '@prisma/client';

import { InvitationsController } from '../invitations.controller';
import { InvitationsService } from '../invitations.service';
import { InvitationResponseMapper } from '../mappers/invitation-response.mapper';

import { CreateInvitationGuard } from '../guards/create-invitation.guard';
import { ResendInvitationGuard } from '../guards/resend-invitation.guard';
import { RevokeInvitationGuard } from '../guards/revoke-invitation.guard';
import { CancelInvitationGuard } from '../guards/cancel-invitation.guard';
import { ReadInvitationGuard } from '../guards/read-invitation.guard';


describe('InvitationsController (e2e)', () => {
  let app: INestApplication;

  const ACTOR_ID = 'ckm5xj8x40000a1b2c3d4e5f6';
  const TENANT_ID = 'ckm5xj8x40001a1b2c3d4e5f6';

  const INVITATION_ID = 'ckm5xj8x40003a1b2c3d4e5f6';

  const invitationsService = {
    createInvitation: jest.fn(),
    resendInvitation: jest.fn(),
    revokeInvitation: jest.fn(),
    cancelInvitation: jest.fn(),
    declineInvitation: jest.fn(),
    acceptInvitationByToken: jest.fn(),
    getInvitationById: jest.fn(),
    getInvitationByToken: jest.fn(),
    listInvitations: jest.fn(),
  };

  class AllowAdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      req.user = {
        userId: ACTOR_ID,
        isPlatformAdmin: true,
      };
      return true;
    }
  }

  const mapper = {
    toResponse: jest.fn(),
    toPublicResponse: jest.fn(),
  };

  const invitationEntity = {
    id: INVITATION_ID,
    recipientType: InvitationRecipientType.EMAIL,
    recipientValue: 'user@example.com',
    scopeType: MembershipScopeType.TENANT,
    tenantId: TENANT_ID,
    storeId: null,
    proposedRoleKey: null,
    status: InvitationStatus.SENT,
    expiresAt: new Date('2026-04-20T12:00:00.000Z'),
    membershipId: null,
    sentAt: new Date('2026-04-17T12:00:00.000Z'),
    acceptedAt: null,
    declinedAt: null,
    revokedAt: null,
    canceledAt: null,
    expiredAt: null,
    createdBy: ACTOR_ID,
    createdAt: new Date('2026-04-17T11:00:00.000Z'),
    updatedAt: new Date('2026-04-17T12:00:00.000Z'),
  };

  const invitationResponse = {
    id: invitationEntity.id,
    recipientType: invitationEntity.recipientType,
    recipientValue: invitationEntity.recipientValue,
    scopeType: invitationEntity.scopeType,
    tenantId: invitationEntity.tenantId,
    storeId: invitationEntity.storeId,
    proposedRoleKey: invitationEntity.proposedRoleKey,
    status: invitationEntity.status,
    expiresAt: invitationEntity.expiresAt.toISOString(),
    membershipId: invitationEntity.membershipId,
    sentAt: invitationEntity.sentAt?.toISOString() ?? null,
    acceptedAt: null,
    declinedAt: null,
    revokedAt: null,
    canceledAt: null,
    expiredAt: null,
    createdBy: invitationEntity.createdBy,
    createdAt: invitationEntity.createdAt.toISOString(),
    updatedAt: invitationEntity.updatedAt.toISOString(),
  };

  const invitationPublicResponse = {
    id: invitationEntity.id,
    recipientType: invitationEntity.recipientType,
    scopeType: invitationEntity.scopeType,
    tenantId: invitationEntity.tenantId,
    storeId: invitationEntity.storeId,
    proposedRoleKey: invitationEntity.proposedRoleKey,
    status: invitationEntity.status,
    expiresAt: invitationEntity.expiresAt.toISOString(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mapper.toResponse.mockReturnValue(invitationResponse);
    mapper.toPublicResponse.mockReturnValue(invitationPublicResponse);

    const moduleRef = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        {
          provide: InvitationsService,
          useValue: invitationsService,
        },
        {
          provide: InvitationResponseMapper,
          useValue: mapper,
        },
      ],
    })
      .overrideGuard(CreateInvitationGuard)
      .useValue(new AllowAdminGuard())
      .overrideGuard(ResendInvitationGuard)
      .useValue(new AllowAdminGuard())
      .overrideGuard(RevokeInvitationGuard)
      .useValue(new AllowAdminGuard())
      .overrideGuard(CancelInvitationGuard)
      .useValue(new AllowAdminGuard())
      .overrideGuard(ReadInvitationGuard)
      .useValue(new AllowAdminGuard())
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

  it('POST /v1/invitations should create invitation and return mapped response + token', async () => {
    invitationsService.createInvitation.mockResolvedValue({
      invitation: invitationEntity,
      token: 'plain-token',
    });

    const res = await request(app.getHttpServer())
      .post('/v1/invitations')
      .send({
        recipientType: 'EMAIL',
        recipientValue: 'user@example.com',
        scopeType: 'TENANT',
        tenantId: TENANT_ID,
      })
      .expect(201);

    expect(invitationsService.createInvitation).toHaveBeenCalledWith(
      ACTOR_ID,
      expect.objectContaining({
        recipientType: 'EMAIL',
        recipientValue: 'user@example.com',
        scopeType: 'TENANT',
        tenantId: TENANT_ID,
      }),
    );

    expect(mapper.toResponse).toHaveBeenCalledWith(invitationEntity);

    expect(res.body).toEqual({
      invitation: invitationResponse,
      token: 'plain-token',
    });
  });

  it('POST /v1/invitations/:id/resend should resend invitation and return mapped response + token', async () => {
    invitationsService.resendInvitation.mockResolvedValue({
      invitation: invitationEntity,
      token: 'resent-token',
    });

    const res = await request(app.getHttpServer())
      .post(`/v1/invitations/${invitationEntity.id}/resend`)
      .send({
        reason: 'manual_resend',
      })
      .expect(201);

    expect(invitationsService.resendInvitation).toHaveBeenCalledWith(
      ACTOR_ID,
      invitationEntity.id,
      { reason: 'manual_resend' },
    );

    expect(res.body).toEqual({
      invitation: invitationResponse,
      token: 'resent-token',
    });
  });

  it('POST /v1/invitations/:id/revoke should revoke invitation and return mapped response', async () => {
    const revokedEntity = {
      ...invitationEntity,
      status: InvitationStatus.REVOKED,
      revokedAt: new Date('2026-04-17T13:00:00.000Z'),
    };

    const revokedResponse = {
      ...invitationResponse,
      status: 'REVOKED',
      revokedAt: revokedEntity.revokedAt.toISOString(),
    };

    invitationsService.revokeInvitation.mockResolvedValue(revokedEntity);
    mapper.toResponse.mockReturnValue(revokedResponse);

    const res = await request(app.getHttpServer())
      .post(`/v1/invitations/${invitationEntity.id}/revoke`)
      .send({
        reason: 'admin_revocation',
      })
      .expect(201);

    expect(invitationsService.revokeInvitation).toHaveBeenCalledWith(
      ACTOR_ID,
      invitationEntity.id,
      { reason: 'admin_revocation' },
    );

    expect(res.body).toEqual(revokedResponse);
  });

  it('POST /v1/invitations/:id/cancel should cancel invitation and return mapped response', async () => {
    const canceledEntity = {
      ...invitationEntity,
      status: InvitationStatus.CANCELED,
      canceledAt: new Date('2026-04-17T13:00:00.000Z'),
    };

    const canceledResponse = {
      ...invitationResponse,
      status: 'CANCELED',
      canceledAt: canceledEntity.canceledAt.toISOString(),
    };

    invitationsService.cancelInvitation.mockResolvedValue(canceledEntity);
    mapper.toResponse.mockReturnValue(canceledResponse);

    const res = await request(app.getHttpServer())
      .post(`/v1/invitations/${invitationEntity.id}/cancel`)
      .send({
        reason: 'admin_cancel_before_send',
      })
      .expect(201);

    expect(invitationsService.cancelInvitation).toHaveBeenCalledWith(
      ACTOR_ID,
      invitationEntity.id,
      { reason: 'admin_cancel_before_send' },
    );

    expect(res.body).toEqual(canceledResponse);
  });

  it('POST /v1/invitations/:id/decline should decline invitation and return public mapped response', async () => {
    const declinedEntity = {
      ...invitationEntity,
      status: InvitationStatus.DECLINED,
      declinedAt: new Date('2026-04-17T13:00:00.000Z'),
    };

    const declinedPublicResponse = {
      ...invitationPublicResponse,
      status: 'DECLINED',
    };

    invitationsService.declineInvitation.mockResolvedValue(declinedEntity);
    mapper.toPublicResponse.mockReturnValue(declinedPublicResponse);

    const res = await request(app.getHttpServer())
      .post(`/v1/invitations/${invitationEntity.id}/decline`)
      .send({
        reason: 'not_interested',
      })
      .expect(201);

    expect(invitationsService.declineInvitation).toHaveBeenCalledWith(
      invitationEntity.id,
      { reason: 'not_interested' },
    );

    expect(res.body).toEqual(declinedPublicResponse);
  });

  it('POST /v1/invitations/accept should accept by token and return public invitation + membership data', async () => {
    const acceptedEntity = {
      ...invitationEntity,
      status: InvitationStatus.ACCEPTED,
      membershipId: 'mem_01',
      acceptedAt: new Date('2026-04-17T13:00:00.000Z'),
    };

    const acceptedPublicResponse = {
      ...invitationPublicResponse,
      status: 'ACCEPTED',
    };

    invitationsService.acceptInvitationByToken.mockResolvedValue({
      invitation: acceptedEntity,
      membershipId: 'mem_01',
      accepted: true,
      idempotent: false,
    });

    mapper.toPublicResponse.mockReturnValue(acceptedPublicResponse);

    const res = await request(app.getHttpServer())
      .post('/v1/invitations/accept?token=plain-token')
      .send({
        recipientValue: 'user@example.com',
      })
      .expect(201);

    expect(invitationsService.acceptInvitationByToken).toHaveBeenCalledWith(
      'plain-token',
      { recipientValue: 'user@example.com' },
    );

    expect(res.body).toEqual({
      invitation: acceptedPublicResponse,
      membershipId: 'mem_01',
      accepted: true,
      idempotent: false,
    });
  });

  it('GET /v1/invitations/:id should return invitation by id', async () => {
    invitationsService.getInvitationById.mockResolvedValue(invitationResponse);

    const res = await request(app.getHttpServer())
      .get(`/v1/invitations/${invitationEntity.id}`)
      .expect(200);

    expect(invitationsService.getInvitationById).toHaveBeenCalledWith(
      invitationEntity.id,
    );
    expect(res.body).toEqual(invitationResponse);
  });

  it('GET /v1/invitations/by-token should return invitation by token', async () => {
    invitationsService.getInvitationByToken.mockResolvedValue(invitationPublicResponse);

    const res = await request(app.getHttpServer())
      .get('/v1/invitations/by-token?token=plain-token')
      .expect(200);

    expect(invitationsService.getInvitationByToken).toHaveBeenCalledWith({
      token: 'plain-token',
    });

    expect(res.body).toEqual(invitationPublicResponse);
  });

  it('GET /v1/invitations should return paginated invitations', async () => {
    invitationsService.listInvitations.mockResolvedValue({
      items: [invitationResponse],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    const res = await request(app.getHttpServer())
      .get('/v1/invitations?page=1&pageSize=20&status=SENT')
      .expect(200);

    expect(invitationsService.listInvitations).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      status: 'SENT',
    });

    expect(res.body).toEqual({
      items: [invitationResponse],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });
});