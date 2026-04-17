// packages/api/src/modules/01-identity-and-access/01-users/repositories/user-contact-change-requests.repository.ts

import { Injectable } from '@nestjs/common';
import {
  Prisma,
  UserContactChangeRequest,
  UserContactChangeStatus,
  UserContactChangeType,
} from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class UserContactChangeRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.UserContactChangeRequestUncheckedCreateInput,
  ): Promise<UserContactChangeRequest> {
    return this.prisma.userContactChangeRequest.create({
      data,
    });
  }

  /**
   * Returns the latest active request for a user and contact type.
   * Active = PENDING or VERIFIED.
   */
  async findLatestActiveByUserIdAndType(
    userId: string,
    type: UserContactChangeType,
  ): Promise<UserContactChangeRequest | null> {
    return this.prisma.userContactChangeRequest.findFirst({
      where: {
        userId,
        type,
        status: {
          in: [
            UserContactChangeStatus.PENDING,
            UserContactChangeStatus.VERIFIED,
          ],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findPendingByVerificationRef(
    verificationRef: string,
  ): Promise<UserContactChangeRequest | null> {
    return this.prisma.userContactChangeRequest.findFirst({
      where: {
        verificationRef,
        status: UserContactChangeStatus.PENDING,
      },
    });
  }

  async findByVerificationRef(
    verificationRef: string,
  ): Promise<UserContactChangeRequest | null> {
    return this.prisma.userContactChangeRequest.findUnique({
      where: {
        verificationRef,
      },
    });
  }

  async cancelById(id: string): Promise<UserContactChangeRequest> {
    return this.prisma.userContactChangeRequest.update({
      where: { id },
      data: {
        status: UserContactChangeStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }

  async markVerifiedById(id: string): Promise<UserContactChangeRequest> {
    return this.prisma.userContactChangeRequest.update({
      where: { id },
      data: {
        status: UserContactChangeStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });
  }

  async markConsumedById(id: string): Promise<UserContactChangeRequest> {
    return this.prisma.userContactChangeRequest.update({
      where: { id },
      data: {
        status: UserContactChangeStatus.CONSUMED,
        consumedAt: new Date(),
      },
    });
  }

  async markExpiredPendingRequests(
    referenceDate = new Date(),
  ): Promise<number> {
    const result = await this.prisma.userContactChangeRequest.updateMany({
      where: {
        status: UserContactChangeStatus.PENDING,
        expiresAt: {
          lt: referenceDate,
        },
      },
      data: {
        status: UserContactChangeStatus.EXPIRED,
      },
    });

    return result.count;
  }

  async cancelActiveByUserIdAndType(
    userId: string,
    type: UserContactChangeType,
  ): Promise<number> {
    const result = await this.prisma.userContactChangeRequest.updateMany({
      where: {
        userId,
        type,
        status: {
          in: [
            UserContactChangeStatus.PENDING,
            UserContactChangeStatus.VERIFIED,
          ],
        },
      },
      data: {
        status: UserContactChangeStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    return result.count;
  }
}
