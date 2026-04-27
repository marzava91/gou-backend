import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../../prisma/prisma.service';
import { AccessMembershipReaderPort } from '../../ports/access-membership-reader.port';

@Injectable()
export class PrismaAccessMembershipReaderAdapter
  implements AccessMembershipReaderPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findAuthorizationAnchorByMembershipId(membershipId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      select: {
        id: true,
        userId: true,
        scopeType: true,
        tenantId: true,
        storeId: true,
        status: true,
      },
    });

    if (!membership) return null;

    return {
      membershipId: membership.id,
      userId: membership.userId,
      scopeType: membership.scopeType,
      tenantId: membership.tenantId,
      storeId: membership.storeId,
      status: membership.status,
    };
  }
}