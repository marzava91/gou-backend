// packages/api/src/modules/01-identity-and-access/03-memberships/application/membership-command.service.ts

import { Inject, Injectable } from '@nestjs/common';
import { MembershipStatus, Prisma } from '@prisma/client';

import { MembershipsRepository } from '../memberships.repository';
import { MembershipSupportService } from './support/membership-support.service';

import { CreateMembershipDto } from '../dto/commands/create-membership.dto';
import { ActivateMembershipDto } from '../dto/commands/activate-membership.dto';
import { SuspendMembershipDto } from '../dto/commands/suspend-membership.dto';
import { RevokeMembershipDto } from '../dto/commands/revoke-membership.dto';
import { ExpireMembershipDto } from '../dto/commands/expire-membership.dto';

import {
  MEMBERSHIP_SCOPE_DIRECTORY_PORT,
  type MembershipScopeDirectoryPort,
} from '../ports/membership-scope-directory.port';
import {
  MEMBERSHIP_INVITATION_READER_PORT,
  type MembershipInvitationReaderPort,
} from '../ports/membership-invitation-reader.port';

import { MEMBERSHIP_AUDIT_ACTIONS } from '../domain/constants/membership.constants';
import {
  DuplicateMembershipError,
  InvalidMembershipScopeError,
  InvalidMembershipTransitionError,
  InvitationMembershipConflictError,
  MembershipNotFoundError,
} from '../domain/errors/membership.errors';
import { MembershipDomainEvents } from '../domain/events/membership.events';
import { validateMembershipScope } from '../domain/rules/membership-scope.rule';
import { canTransitionMembershipStatus } from '../domain/rules/membership-status-transition.rule';

@Injectable()
export class MembershipCommandService {
  constructor(
    private readonly membershipsRepository: MembershipsRepository,
    private readonly membershipSupportService: MembershipSupportService,
    @Inject(MEMBERSHIP_SCOPE_DIRECTORY_PORT)
    private readonly membershipScopeDirectoryPort: MembershipScopeDirectoryPort,
    @Inject(MEMBERSHIP_INVITATION_READER_PORT)
    private readonly membershipInvitationReaderPort: MembershipInvitationReaderPort,
  ) {}

  async createMembership(
    actorId: string | null | undefined,
    dto: CreateMembershipDto,
  ) {
    const at = this.membershipSupportService.now();
    const normalizedReason = this.membershipSupportService.normalizeReason(
      dto.reason,
    );

    if (
      !validateMembershipScope({
        scopeType: dto.scopeType,
        tenantId: dto.tenantId,
        storeId: dto.storeId ?? null,
      })
    ) {
      throw new InvalidMembershipScopeError();
    }

    await this.assertScopeExists({
      tenantId: dto.tenantId,
      storeId: dto.storeId ?? null,
    });

    if (dto.invitationId) {
      await this.assertInvitationConsistency(dto);
    }

    const equivalentMembership =
      await this.membershipsRepository.findEquivalentOpenMembership({
        userId: dto.userId,
        scopeType: dto.scopeType,
        tenantId: dto.tenantId,
        storeId: dto.storeId ?? null,
      });

    if (equivalentMembership) {
      throw new DuplicateMembershipError();
    }

    const membership = await this.membershipsRepository.createMembership({
      userId: dto.userId,
      scopeType: dto.scopeType,
      tenantId: dto.tenantId,
      storeId: dto.storeId ?? null,
      invitationId: dto.invitationId ?? null,
      status: MembershipStatus.PENDING,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      reason: normalizedReason,
      createdAt: at,
      updatedAt: at,
      version: 1,
    });

    await this.membershipsRepository.createStatusHistory({
      membershipId: membership.id,
      fromStatus: null,
      toStatus: MembershipStatus.PENDING,
      reason: normalizedReason,
      changedBy: actorId ?? null,
      createdAt: at,
    });

    await this.membershipSupportService.recordAudit({
      action: MEMBERSHIP_AUDIT_ACTIONS.MEMBERSHIP_CREATED,
      actorId,
      membershipId: membership.id,
      payload: {
        userId: membership.userId,
        scopeType: membership.scopeType,
        tenantId: membership.tenantId,
        storeId: membership.storeId,
        invitationId: membership.invitationId,
      },
      at,
    });

    await this.membershipSupportService.publishEvent({
      event: MembershipDomainEvents.MEMBERSHIP_CREATED,
      payload: {
        membershipId: membership.id,
        userId: membership.userId,
        scopeType: membership.scopeType,
        tenantId: membership.tenantId,
        storeId: membership.storeId,
      },
      at,
    });

    return membership;
  }

  async activateMembership(
    actorId: string | null | undefined,
    membershipId: string,
    dto: ActivateMembershipDto,
  ) {
    return this.transitionMembershipStatus({
      actorId,
      membershipId,
      toStatus: MembershipStatus.ACTIVE,
      reason: dto.reason,
    });
  }

  async suspendMembership(
    actorId: string | null | undefined,
    membershipId: string,
    dto: SuspendMembershipDto,
  ) {
    return this.transitionMembershipStatus({
      actorId,
      membershipId,
      toStatus: MembershipStatus.SUSPENDED,
      reason: dto.reason,
    });
  }

  async revokeMembership(
    actorId: string | null | undefined,
    membershipId: string,
    dto: RevokeMembershipDto,
  ) {
    return this.transitionMembershipStatus({
      actorId,
      membershipId,
      toStatus: MembershipStatus.REVOKED,
      reason: dto.reason,
    });
  }

  async expireMembership(
    actorId: string | null | undefined,
    membershipId: string,
    dto: ExpireMembershipDto,
  ) {
    const at = dto.expiredAt ? new Date(dto.expiredAt) : undefined;

    return this.transitionMembershipStatus({
      actorId,
      membershipId,
      toStatus: MembershipStatus.EXPIRED,
      reason: dto.reason,
      at,
    });
  }

  private async transitionMembershipStatus(input: {
    actorId: string | null | undefined;
    membershipId: string;
    toStatus: MembershipStatus;
    reason?: string | null;
    at?: Date;
  }) {
    const currentMembership = await this.membershipsRepository.findById(
      input.membershipId,
    );

    if (!currentMembership) {
      throw new MembershipNotFoundError();
    }

    if (
      !canTransitionMembershipStatus(currentMembership.status, input.toStatus)
    ) {
      throw new InvalidMembershipTransitionError();
    }

    const at = input.at ?? this.membershipSupportService.now();
    const normalizedReason = this.membershipSupportService.normalizeReason(
      input.reason,
    );
    const timestampField =
      this.membershipSupportService.resolveStatusTimestampField(input.toStatus);

    const updatedCount =
      await this.membershipsRepository.updateMembershipStatus({
        id: currentMembership.id,
        fromStatus: currentMembership.status,
        toStatus: input.toStatus,
        reason: normalizedReason,
        timestampField,
        at,
      });

    if (updatedCount !== 1) {
      throw new InvalidMembershipTransitionError();
    }

    await this.membershipsRepository.createStatusHistory({
      membershipId: currentMembership.id,
      fromStatus: currentMembership.status,
      toStatus: input.toStatus,
      reason: normalizedReason,
      changedBy: input.actorId ?? null,
      createdAt: at,
    });

    if (
      input.toStatus === MembershipStatus.SUSPENDED ||
      input.toStatus === MembershipStatus.REVOKED ||
      input.toStatus === MembershipStatus.EXPIRED
    ) {
      await this.membershipsRepository.clearActiveContextsForMembership(
        currentMembership.id,
      );
    }

    await this.membershipSupportService.recordLifecycleChange({
      toStatus: input.toStatus,
      actorId: input.actorId,
      membershipId: currentMembership.id,
      payload: {
        userId: currentMembership.userId,
        previousStatus: currentMembership.status,
        newStatus: input.toStatus,
        tenantId: currentMembership.tenantId,
        storeId: currentMembership.storeId,
      },
      at,
    });

    return this.membershipsRepository.findByIdOrThrow(currentMembership.id);
  }

  private async assertScopeExists(input: {
    tenantId: string;
    storeId?: string | null;
  }): Promise<void> {
    const tenantExists = await this.membershipScopeDirectoryPort.tenantExists(
      input.tenantId,
    );

    if (!tenantExists) {
      throw new InvalidMembershipScopeError();
    }

    if (input.storeId) {
      const storeExists = await this.membershipScopeDirectoryPort.storeExists(
        input.storeId,
      );
      const belongsToTenant =
        await this.membershipScopeDirectoryPort.storeBelongsToTenant({
          storeId: input.storeId,
          tenantId: input.tenantId,
        });

      if (!storeExists || !belongsToTenant) {
        throw new InvalidMembershipScopeError();
      }
    }
  }

  private async assertInvitationConsistency(
    dto: CreateMembershipDto,
  ): Promise<void> {
    if (!dto.invitationId) {
      return;
    }

    const invitation =
      await this.membershipInvitationReaderPort.findAcceptedInvitationById({
        invitationId: dto.invitationId,
      });

    if (!invitation) {
      throw new InvitationMembershipConflictError();
    }

    if (invitation.userId !== dto.userId) {
      throw new InvitationMembershipConflictError();
    }

    if (invitation.tenantId !== dto.tenantId) {
      throw new InvitationMembershipConflictError();
    }

    if ((invitation.storeId ?? null) !== (dto.storeId ?? null)) {
      throw new InvitationMembershipConflictError();
    }
  }
}
