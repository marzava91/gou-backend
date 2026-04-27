// packages/api/src/integrations/__tests__/identity-access/invitations-memberships.integration.spec.ts

import {
  PrismaClient,
  InvitationStatus,
  MembershipStatus,
  InvitationRecipientType,
  MembershipScopeType,
} from '@prisma/client';
import { cleanIdentityAccessTestData } from '../../setup/test-db-cleaner';

const prisma = new PrismaClient();

jest.setTimeout(30000);

describe('Invitations → Users → Memberships Integration', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await cleanIdentityAccessTestData(prisma);
  });

  afterAll(async () => {
    await cleanIdentityAccessTestData(prisma);
    await prisma.$disconnect();
  });

  it('should create a membership linked to an invitation and user', async () => {
    const email = `integration-test-${Date.now()}@example.com`;

    const invitation = await prisma.invitation.create({
      data: {
        recipientType: InvitationRecipientType.EMAIL,
        recipientValue: email,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_test',
        status: InvitationStatus.SENT,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const user = await prisma.user.create({
      data: {
        primaryEmail: email,
        emailVerified: true,
      },
    });

    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        scopeType: MembershipScopeType.TENANT,
        tenantId: 'tenant_test',
        status: MembershipStatus.ACTIVE,
        invitationId: invitation.id,
      },
    });

    expect(user.id).toBeDefined();
    expect(user.primaryEmail).toBe(email);

    expect(invitation.id).toBeDefined();
    expect(invitation.recipientValue).toBe(email);

    expect(membership.userId).toBe(user.id);
    expect(membership.invitationId).toBe(invitation.id);
    expect(membership.status).toBe(MembershipStatus.ACTIVE);

    const foundMembership = await prisma.membership.findUnique({
      where: { id: membership.id },
    });

    expect(foundMembership).not.toBeNull();
    expect(foundMembership?.userId).toBe(user.id);
    expect(foundMembership?.invitationId).toBe(invitation.id);
    expect(foundMembership?.status).toBe(MembershipStatus.ACTIVE);

    const foundInvitation = await prisma.invitation.findUnique({
      where: { id: invitation.id },
    });

    expect(foundInvitation).not.toBeNull();
    expect(foundInvitation?.recipientValue).toBe(email);
  });
});