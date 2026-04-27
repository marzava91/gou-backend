import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../../prisma/prisma.service';
import { AccessGrantReaderPort } from '../../ports/access-grant-reader.port';

@Injectable()
export class PrismaAccessGrantReaderAdapter implements AccessGrantReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async listMembershipGrants(membershipId: string) {
    return this.prisma.grant.findMany({
      where: {
        membershipId,
      },
      select: {
        id: true,
        membershipId: true,
        effect: true,
        targetType: true,
        capabilityKey: true,
        resourceKey: true,
        actionKey: true,
        status: true,
        validFrom: true,
        validUntil: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}