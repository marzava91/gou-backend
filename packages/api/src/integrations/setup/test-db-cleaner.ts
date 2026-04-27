// packages\api\src\integrations\setup\test-db-cleaner.ts

import type { PrismaClient } from '@prisma/client';

export async function cleanIdentityAccessTestData(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.authSession.deleteMany({
    where: {
      OR: [
        { deviceName: { contains: 'integration-test' } },
        { userAgent: { contains: 'integration-test' } },
      ],
    },
  });

  await prisma.authVerificationChallenge.deleteMany({
    where: {
      OR: [
        { target: { contains: 'integration-test' } },
        { verificationRef: { contains: 'integration-test' } },
      ],
    },
  });

  await prisma.authIdentity.deleteMany({
    where: {
      OR: [
        { providerSubject: { contains: 'integration-test' } },
        { email: { contains: 'integration-test' } },
        { phone: { contains: 'integration-test' } },
      ],
    },
  });

  await prisma.activeMembershipContext.deleteMany({
    where: {
      user: {
        OR: [
          { primaryEmail: { contains: 'integration-test' } },
          { primaryPhone: { contains: 'integration-test' } },
        ],
      },
    },
  });

  await prisma.roleAssignmentHistory.deleteMany({
    where: {
      roleAssignment: {
        membership: {
          user: {
            OR: [
              { primaryEmail: { contains: 'integration-test' } },
              { primaryPhone: { contains: 'integration-test' } },
            ],
          },
        },
      },
    },
  });

  await prisma.roleAssignment.deleteMany({
    where: {
      membership: {
        user: {
          OR: [
            { primaryEmail: { contains: 'integration-test' } },
            { primaryPhone: { contains: 'integration-test' } },
          ],
        },
      },
    },
  });

  await prisma.grantHistory.deleteMany({
    where: {
      grant: {
        membership: {
          user: {
            OR: [
              { primaryEmail: { contains: 'integration-test' } },
              { primaryPhone: { contains: 'integration-test' } },
            ],
          },
        },
      },
    },
  });

  await prisma.grant.deleteMany({
    where: {
      membership: {
        user: {
          OR: [
            { primaryEmail: { contains: 'integration-test' } },
            { primaryPhone: { contains: 'integration-test' } },
          ],
        },
      },
    },
  });

  await prisma.membershipStatusHistory.deleteMany({
    where: {
      membership: {
        user: {
          OR: [
            { primaryEmail: { contains: 'integration-test' } },
            { primaryPhone: { contains: 'integration-test' } },
          ],
        },
      },
    },
  });

  await prisma.membership.deleteMany({
    where: {
      user: {
        OR: [
          { primaryEmail: { contains: 'integration-test' } },
          { primaryPhone: { contains: 'integration-test' } },
        ],
      },
    },
  });

  await prisma.invitationAcceptanceRecord.deleteMany({
    where: {
      recipientValue: { contains: 'integration-test' },
    },
  });

  await prisma.invitationHistory.deleteMany({
    where: {
      invitation: {
        recipientValue: { contains: 'integration-test' },
      },
    },
  });

  await prisma.invitation.deleteMany({
    where: {
      recipientValue: { contains: 'integration-test' },
    },
  });

  await prisma.userContactChangeRequest.deleteMany({
    where: {
      OR: [
        { newValue: { contains: 'integration-test' } },
        {
          user: {
            OR: [
              { primaryEmail: { contains: 'integration-test' } },
              { primaryPhone: { contains: 'integration-test' } },
            ],
          },
        },
      ],
    },
  });

  await prisma.user.deleteMany({
    where: {
      OR: [
        { primaryEmail: { contains: 'integration-test' } },
        { primaryPhone: { contains: 'integration-test' } },
      ],
    },
  });
}