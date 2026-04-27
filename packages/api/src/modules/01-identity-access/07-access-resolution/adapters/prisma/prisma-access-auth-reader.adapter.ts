import { Injectable } from '@nestjs/common';
import { AuthSessionStatus, OperationalSurface } from '@prisma/client';

import { PrismaService } from '../../../../../prisma/prisma.service';
import { AccessAuthReaderPort } from '../../ports/access-auth-reader.port';

@Injectable()
export class PrismaAccessAuthReaderAdapter implements AccessAuthReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async findSessionByIdAndUserId(input: {
    sessionId: string;
    userId: string;
  }) {
    const session = await this.prisma.authSession.findFirst({
      where: {
        id: input.sessionId,
        userId: input.userId,
        status: {
          in: [
            AuthSessionStatus.ISSUED,
            AuthSessionStatus.ACTIVE,
            AuthSessionStatus.REFRESHED,
          ],
        },
        revokedAt: null,
        loggedOutAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!session) return null;

    return {
      sessionId: session.id,
      userId: session.userId,
      status: session.status,
    };
  }

  async getActiveContext(input: {
    userId: string;
    surface: OperationalSurface;
  }) {
    const context = await this.prisma.activeMembershipContext.findUnique({
      where: {
        userId_surface: {
          userId: input.userId,
          surface: input.surface,
        },
      },
      include: {
        membership: true,
      },
    });

    if (!context || !context.membership) return null;

    return {
      userId: context.userId,
      membershipId: context.membershipId,
      surface: context.surface,
      scopeType: context.membership.scopeType,
      tenantId: context.membership.tenantId,
      storeId: context.membership.storeId,
      status: context.membership.status,
      updatedAt: context.updatedAt,
    };
  }
}