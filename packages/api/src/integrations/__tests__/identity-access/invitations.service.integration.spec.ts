// packages/api/src/integrations/__tests__/identity-access/invitations.service.integration.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import {
  InvitationRecipientType,
  InvitationStatus,
  MembershipScopeType,
  MembershipStatus,
  UserStatus,
} from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { InvitationsModule } from '../../../modules/01-identity-access/06-invitations/invitations.module';
import { InvitationsService } from '../../../modules/01-identity-access/06-invitations/invitations.service';

import { INVITATION_USER_RESOLUTION_PORT } from '../../../modules/01-identity-access/06-invitations/ports/invitation-user-resolution.port';
import { INVITATION_NOTIFICATION_PORT } from '../../../modules/01-identity-access/06-invitations/ports/invitation-notification.port';

import {
  EquivalentActiveInvitationExistsError,
  InvitationRecipientMismatchError,
  InvalidInvitationExpirationError,
  InvalidInvitationScopeError,
  InvalidInvitationTokenError,
} from '../../../modules/01-identity-access/06-invitations/domain/errors/invitation.errors';

import { cleanIdentityAccessTestData } from '../../setup/test-db-cleaner';

jest.setTimeout(30000);

describe('InvitationsService Integration (REAL DB)', () => {
  let moduleRef: TestingModule;
  let invitationsService: InvitationsService;
  let prisma: PrismaService;

  const userResolution = {
    resolveOrCreateUserByRecipient: jest.fn(),
  };

  const notificationPort = {
    sendInvitation: jest.fn(),
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [InvitationsModule],
    })
      .overrideProvider(INVITATION_USER_RESOLUTION_PORT)
      .useValue(userResolution)
      .overrideProvider(INVITATION_NOTIFICATION_PORT)
      .useValue(notificationPort)
      .compile();

    invitationsService = moduleRef.get(InvitationsService);
    prisma = moduleRef.get(PrismaService);

    await prisma.$connect();
    await cleanIdentityAccessTestData(prisma);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanIdentityAccessTestData(prisma);
    await prisma.$disconnect();
    await moduleRef.close();
  });

  function expiresInHours(hours: number): string {
    return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  }

  async function createIntegrationUser(email?: string) {
    return prisma.user.create({
      data: {
        primaryEmail:
          email ??
          `integration-test-invitation-user-${Date.now()}-${Math.random()}@example.com`,
        emailVerified: true,
        status: UserStatus.ACTIVE,
      },
    });
  }

  it('creates and sends an invitation with token, history, and persisted hash', async () => {
    const result = await invitationsService.createInvitation(
      'integration-test-actor',
      {
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: ` Integration-Test-Invite-${Date.now()}@Example.com `,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'integration-test-tenant-invitation',
        expiresAt: expiresInHours(24),
      } as any,
    );

    expect(result.token).toBeDefined();
    expect(result.invitation.id).toBeDefined();
    expect(result.invitation.status).toBe(InvitationStatus.SENT);
    expect(result.invitation.recipientValue).toContain(
      'integration-test-invite-',
    );
    expect(result.invitation.recipientValue).toContain('@example.com');
    expect(result.invitation.currentTokenHash).toBeDefined();

    const persisted = await prisma.invitation.findUnique({
      where: { id: result.invitation.id },
    });

    expect(persisted).not.toBeNull();
    expect(persisted?.status).toBe(InvitationStatus.SENT);
    expect(persisted?.currentTokenHash).toBeDefined();
    expect(persisted?.sentAt).toBeInstanceOf(Date);

    const history = await prisma.invitationHistory.findMany({
      where: { invitationId: result.invitation.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(history.map((item) => item.toStatus)).toEqual([
      InvitationStatus.PROPOSED,
      InvitationStatus.SENT,
    ]);

    expect(notificationPort.sendInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        invitationId: result.invitation.id,
        token: result.token,
      }),
    );
  });

  it('rejects equivalent active invitation', async () => {
    const email = `integration-test-duplicate-invite-${Date.now()}@example.com`;

    await invitationsService.createInvitation('integration-test-actor', {
      recipientType: InvitationRecipientType.EMAIL,
      recipientValue: email,
      scopeType: MembershipScopeType.TENANT,
      tenantId: 'integration-test-tenant-duplicate-invitation',
      expiresAt: expiresInHours(24),
    } as any);

    await expect(
      invitationsService.createInvitation('integration-test-actor', {
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: email,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'integration-test-tenant-duplicate-invitation',
        expiresAt: expiresInHours(24),
      } as any),
    ).rejects.toBeInstanceOf(EquivalentActiveInvitationExistsError);
  });

  it('rejects invalid tenant invitation scope with storeId', async () => {
    await expect(
      invitationsService.createInvitation('integration-test-actor', {
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: `integration-test-invalid-scope-${Date.now()}@example.com`,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'integration-test-tenant-invalid-scope',
        storeId: 'integration-test-store-should-not-exist',
        expiresAt: expiresInHours(24),
      } as any),
    ).rejects.toBeInstanceOf(InvalidInvitationScopeError);
  });

  it('rejects invitation TTL below minimum', async () => {
    await expect(
      invitationsService.createInvitation('integration-test-actor', {
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: `integration-test-short-ttl-${Date.now()}@example.com`,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'integration-test-tenant-short-ttl',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      } as any),
    ).rejects.toBeInstanceOf(InvalidInvitationExpirationError);
  });

  it('accepts invitation by token and creates membership + acceptance record', async () => {
    const email = `integration-test-accept-${Date.now()}@example.com`;
    const user = await createIntegrationUser(email);

    userResolution.resolveOrCreateUserByRecipient.mockResolvedValue({
      userId: user.id,
      created: false,
    });

    const created = await invitationsService.createInvitation(
      'integration-test-actor',
      {
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: email,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'integration-test-tenant-accept',
        expiresAt: expiresInHours(24),
      } as any,
    );

    const accepted = await invitationsService.acceptInvitationByToken(
      created.token,
      {
        recipientValue: email,
      } as any,
    );

    expect(accepted.accepted).toBe(true);
    expect(accepted.idempotent).toBe(false);
    expect(accepted.membershipId).toBeDefined();

    const invitation = await prisma.invitation.findUnique({
      where: { id: created.invitation.id },
    });

    expect(invitation?.status).toBe(InvitationStatus.ACCEPTED);
    expect(invitation?.membershipId).toBe(accepted.membershipId);
    expect(invitation?.acceptedByUserId).toBe(user.id);
    expect(invitation?.currentTokenHash).toBeNull();

    const membership = await prisma.membership.findUnique({
      where: { id: accepted.membershipId },
    });

    expect(membership).not.toBeNull();
    expect(membership?.userId).toBe(user.id);
    expect(membership?.invitationId).toBe(created.invitation.id);
    expect(membership?.status).toBe(MembershipStatus.PENDING);

    const acceptanceRecord =
      await prisma.invitationAcceptanceRecord.findUnique({
        where: { invitationId: created.invitation.id },
      });

    expect(acceptanceRecord).not.toBeNull();
    expect(acceptanceRecord?.acceptedByUserId).toBe(user.id);
    expect(acceptanceRecord?.membershipId).toBe(accepted.membershipId);
  });

  it('rejects invitation acceptance when recipient does not match', async () => {
    const email = `integration-test-mismatch-${Date.now()}@example.com`;

    const created = await invitationsService.createInvitation(
      'integration-test-actor',
      {
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: email,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'integration-test-tenant-mismatch',
        expiresAt: expiresInHours(24),
      } as any,
    );

    await expect(
      invitationsService.acceptInvitationByToken(created.token, {
        recipientValue: 'other@example.com',
      } as any),
    ).rejects.toBeInstanceOf(InvitationRecipientMismatchError);
  });

  it('revokes a sent invitation and rejects accepting it after revocation', async () => {
    const email = `integration-test-revoke-${Date.now()}@example.com`;

    const created = await invitationsService.createInvitation(
      'integration-test-actor',
      {
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: email,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'integration-test-tenant-revoke',
        expiresAt: expiresInHours(24),
      } as any,
    );

    const revoked = await invitationsService.revokeInvitation(
      'integration-test-actor',
      created.invitation.id,
      { reason: 'no longer needed' } as any,
    );

    expect(revoked.status).toBe(InvitationStatus.REVOKED);
    expect(revoked.currentTokenHash).toBeNull();
    expect(revoked.revokedAt).toBeInstanceOf(Date);

    await expect(
      invitationsService.acceptInvitationByToken(created.token, {
        recipientValue: email,
      } as any),
    ).rejects.toBeInstanceOf(InvalidInvitationTokenError);
  });

  it('expires due invitations and records expired status', async () => {
    const expiredInvitation = await prisma.invitation.create({
      data: {
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: `integration-test-expire-${Date.now()}@example.com`,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'integration-test-tenant-expire',
        status: InvitationStatus.SENT,
        expiresAt: new Date(Date.now() - 60 * 1000),
        currentTokenHash: 'integration-test-expired-token-hash',
      },
    });

    const result = await invitationsService.expireDueInvitations(new Date());

    expect(result.expiredCount).toBeGreaterThanOrEqual(1);

    const persisted = await prisma.invitation.findUnique({
      where: { id: expiredInvitation.id },
    });

    expect(persisted?.status).toBe(InvitationStatus.EXPIRED);
    expect(persisted?.expiredAt).toBeInstanceOf(Date);
    expect(persisted?.currentTokenHash).toBeNull();
  });
});