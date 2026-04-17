import { Injectable } from '@nestjs/common';
import {
  Invitation,
  InvitationRecipientType,
  InvitationStatus,
  MembershipScopeType,
  MembershipStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';

import {
  InvitationAlreadyAcceptedError,
  InvitationExpiredError,
  InvitationNotFoundError,
  InvalidInvitationStatusTransitionError,
  MembershipConflictError,
} from './domain/errors/invitation.errors';

@Injectable()
export class InvitationsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createInvitation(data: Prisma.InvitationCreateInput) {
    return this.prisma.invitation.create({ data });
  }

  async createHistory(data: Prisma.InvitationHistoryUncheckedCreateInput) {
    return this.prisma.invitationHistory.create({ data });
  }

  async findById(id: string) {
    return this.prisma.invitation.findUnique({ where: { id } });
  }

  async findByTokenHash(currentTokenHash: string) {
    return this.prisma.invitation.findFirst({
      where: {
        currentTokenHash,
      },
    });
  }

  async updateByIdAndVersion(
    id: string,
    version: number,
    data: Prisma.InvitationUncheckedUpdateInput,
  ) {
    const result = await this.prisma.invitation.updateMany({
      where: { id, version },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(id);
  }

  async createAcceptanceRecord(
    data: Prisma.InvitationAcceptanceRecordUncheckedCreateInput,
  ) {
    return this.prisma.invitationAcceptanceRecord.create({ data });
  }

  async findAcceptanceRecordByInvitationId(invitationId: string) {
    return this.prisma.invitationAcceptanceRecord.findUnique({
      where: { invitationId },
    });
  }

  async findEquivalentActiveInvitation(input: {
    recipientType: InvitationRecipientType;
    recipientValue: string;
    scopeType: MembershipScopeType;
    tenantId: string;
    storeId?: string | null;
  }) {
    return this.prisma.invitation.findFirst({
      where: {
        recipientType: input.recipientType,
        recipientValue: input.recipientValue,
        scopeType: input.scopeType,
        tenantId: input.tenantId,
        storeId: input.storeId ?? null,
        status: {
          in: [InvitationStatus.PROPOSED, InvitationStatus.SENT],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listInvitations(params: {
    where?: Prisma.InvitationWhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.InvitationOrderByWithRelationInput;
  }) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.invitation.findMany({
        where: params.where,
        skip: params.skip,
        take: params.take,
        orderBy: params.orderBy,
      }),
      this.prisma.invitation.count({
        where: params.where,
      }),
    ]);

    return { items, total };
  }

  async acceptInvitationTransaction(input: {
    invitationId: string;
    acceptedByUserId: string;
    recipientType: InvitationRecipientType;
    recipientValue: string;
    scopeType: MembershipScopeType;
    tenantId: string;
    storeId?: string | null;
  }): Promise<{
    invitation: Invitation;
    membershipId: string;
    idempotent: boolean;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.invitation.findUnique({
        where: { id: input.invitationId },
      });

      if (!current) {
        throw new InvitationNotFoundError();
      }

      if (
        current.status === InvitationStatus.ACCEPTED &&
        current.membershipId
      ) {
        return {
          invitation: current,
          membershipId: current.membershipId,
          idempotent: true,
        };
      }

      if (current.status !== InvitationStatus.SENT) {
        throw new InvalidInvitationStatusTransitionError();
      }

      if (current.expiresAt.getTime() <= Date.now()) {
        throw new InvitationExpiredError();
      }

      const existingAcceptance = await tx.invitationAcceptanceRecord.findUnique(
        {
          where: { invitationId: current.id },
        },
      );

      if (existingAcceptance) {
        const acceptedInvitation = await tx.invitation.findUnique({
          where: { id: current.id },
        });

        if (acceptedInvitation?.membershipId) {
          return {
            invitation: acceptedInvitation,
            membershipId: acceptedInvitation.membershipId,
            idempotent: true,
          };
        }

        throw new InvitationAlreadyAcceptedError();
      }

      const existingMembership = await tx.membership.findFirst({
        where: {
          userId: input.acceptedByUserId,
          scopeType: input.scopeType,
          tenantId: input.tenantId,
          storeId: input.storeId ?? null,
          status: {
            in: [
              MembershipStatus.PENDING,
              MembershipStatus.ACTIVE,
              MembershipStatus.SUSPENDED,
            ],
          },
        },
      });

      if (existingMembership) {
        throw new MembershipConflictError();
      }

      const membership = await tx.membership.create({
        data: {
          userId: input.acceptedByUserId,
          invitationId: current.id,
          scopeType: input.scopeType,
          tenantId: input.tenantId,
          storeId: input.storeId ?? null,
          status: MembershipStatus.PENDING,
          reason: 'membership_created_from_invitation',
        },
      });

      const acceptedAt = new Date();

      await tx.invitationAcceptanceRecord.create({
        data: {
          invitationId: current.id,
          recipientType: input.recipientType,
          recipientValue: input.recipientValue,
          acceptedByUserId: input.acceptedByUserId,
          membershipId: membership.id,
          acceptedAt,
        },
      });

      const updatedCount = await tx.invitation.updateMany({
        where: {
          id: current.id,
          version: current.version,
          status: InvitationStatus.SENT,
        },
        data: {
          status: InvitationStatus.ACCEPTED,
          membershipId: membership.id,
          acceptedByUserId: input.acceptedByUserId,
          acceptedAt,
          currentTokenHash: null,
          version: { increment: 1 },
        },
      });

      if (updatedCount.count === 0) {
        throw new InvalidInvitationStatusTransitionError();
      }

      await tx.invitationHistory.create({
        data: {
          invitationId: current.id,
          fromStatus: InvitationStatus.SENT,
          toStatus: InvitationStatus.ACCEPTED,
          changedBy: input.acceptedByUserId,
          reason: 'invitation_accepted',
        },
      });

      const updated = await tx.invitation.findUniqueOrThrow({
        where: { id: current.id },
      });

      return {
        invitation: updated,
        membershipId: membership.id,
        idempotent: false,
      };
    });
  }
}
