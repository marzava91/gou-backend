import { Inject, Injectable } from '@nestjs/common';
import { GrantStatus, MembershipStatus, GrantTargetType } from '@prisma/client';

import { GrantsRepository } from '../grants.repository';
import { CreateGrantDto } from '../dto/commands/create-grant.dto';
import { RevokeGrantDto } from '../dto/commands/revoke-grant.dto';
import { GrantSupportService } from './support/grant-support.service';

import { GRANT_MEMBERSHIP_READER_PORT } from '../ports/grant-membership-reader.port';
import type { GrantMembershipReaderPort } from '../ports/grant-membership-reader.port';
import {
  GRANT_AUDIT_ACTIONS,
  DEFAULT_GRANT_STATUS_ON_CREATE,
} from '../domain/constants/grant.constants';
import { GrantDomainEvents } from '../domain/events/grant.events';
import {
  DuplicateActiveGrantError,
  GrantMembershipInactiveError,
  GrantMembershipNotFoundError,
  GrantNotFoundError,
  GrantTargetAmbiguousError,
  InvalidGrantTransitionError,
  InvalidGrantValidityWindowError,
} from '../domain/errors/grant.errors';
import {
  normalizeActionKey,
  normalizeCapabilityKey,
  normalizeResourceKey,
} from '../domain/rules/grant-capability-normalization.rule';
import { canTransitionGrantStatus } from '../domain/rules/grant-status-transition.rule';

@Injectable()
export class GrantCommandService {
  constructor(
    private readonly grantsRepository: GrantsRepository,
    private readonly grantSupportService: GrantSupportService,
    @Inject(GRANT_MEMBERSHIP_READER_PORT)
    private readonly grantMembershipReaderPort: GrantMembershipReaderPort,
  ) {}

  async createGrant(actorId: string | null, dto: CreateGrantDto) {
    const membership = await this.grantMembershipReaderPort.findMembershipById(
      dto.membershipId,
    );

    if (!membership) {
      throw new GrantMembershipNotFoundError();
    }

    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new GrantMembershipInactiveError();
    }

    const normalizedTarget = this.resolveNormalizedTarget(dto);
    const validityWindow = this.resolveValidityWindow(dto);

    const duplicate = await this.grantsRepository.findDuplicateActiveGrant({
      membershipId: dto.membershipId,
      effect: dto.effect,
      targetType: dto.targetType,
      capabilityKey: normalizedTarget.capabilityKey,
      resourceKey: normalizedTarget.resourceKey,
      actionKey: normalizedTarget.actionKey,
    });

    if (duplicate) {
      throw new DuplicateActiveGrantError();
    }

    const at = this.grantSupportService.now();
    const creationReason = this.grantSupportService.normalizeReason(
      dto.reason ?? null,
    );

    const created = await this.grantsRepository.createGrantWithHistory({
      membershipId: dto.membershipId,
      effect: dto.effect,
      targetType: dto.targetType,
      capabilityKey: normalizedTarget.capabilityKey,
      resourceKey: normalizedTarget.resourceKey,
      actionKey: normalizedTarget.actionKey,
      status: DEFAULT_GRANT_STATUS_ON_CREATE,
      validFrom: validityWindow.validFrom,
      validUntil: validityWindow.validUntil,
      creationReason,
      createdBy: actorId,
      activatedAt:
        DEFAULT_GRANT_STATUS_ON_CREATE === GrantStatus.ACTIVE ? at : null,
      version: 1,
      history: {
        fromStatus: null,
        toStatus: DEFAULT_GRANT_STATUS_ON_CREATE,
        changedBy: actorId,
        reason: creationReason,
        createdAt: at,
      },
    });

    await this.grantSupportService.recordAudit({
      action: GRANT_AUDIT_ACTIONS.GRANT_CREATED,
      actorId,
      targetId: created.id,
      payload: {
        membershipId: created.membershipId,
        effect: created.effect,
        targetType: created.targetType,
        capabilityKey: created.capabilityKey,
        resourceKey: created.resourceKey,
        actionKey: created.actionKey,
      },
      at,
    });

    await this.grantSupportService.publishEvent({
      eventName: GrantDomainEvents.GRANT_CREATED,
      payload: {
        grantId: created.id,
        membershipId: created.membershipId,
        effect: created.effect,
        targetType: created.targetType,
      },
    });

    await this.grantSupportService.publishEvent({
      eventName: GrantDomainEvents.EFFECTIVE_PERMISSIONS_CHANGED,
      payload: {
        membershipId: created.membershipId,
        reason: 'grant_created',
        grantId: created.id,
      },
    });

    return created;
  }

  async revokeGrant(
    actorId: string | null,
    grantId: string,
    dto: RevokeGrantDto,
  ) {
    const grant = await this.grantsRepository.findById(grantId);

    if (!grant) {
      throw new GrantNotFoundError();
    }

    if (!canTransitionGrantStatus(grant.status, GrantStatus.REVOKED)) {
      throw new InvalidGrantTransitionError();
    }

    const revokedAt = this.grantSupportService.now();
    const revocationReason = this.grantSupportService.normalizeReason(
      dto.reason ?? null,
    );

    const result = await this.grantsRepository.revokeGrantWithHistory({
      id: grant.id,
      expectedVersion: grant.version,
      currentStatus: grant.status,
      revokedBy: actorId,
      revocationReason,
      revokedAt,
    });

    if (result.count !== 1) {
      throw new InvalidGrantTransitionError(); // o ConflictException más específico
    }

    await this.grantSupportService.recordAudit({
      action: GRANT_AUDIT_ACTIONS.GRANT_REVOKED,
      actorId,
      targetId: grant.id,
      payload: {
        membershipId: grant.membershipId,
        effect: grant.effect,
        targetType: grant.targetType,
      },
      at: revokedAt,
    });

    await this.grantSupportService.publishEvent({
      eventName: GrantDomainEvents.GRANT_REVOKED,
      payload: {
        grantId: grant.id,
        membershipId: grant.membershipId,
        revokedAt,
      },
    });

    await this.grantSupportService.publishEvent({
      eventName: GrantDomainEvents.EFFECTIVE_PERMISSIONS_CHANGED,
      payload: {
        membershipId: grant.membershipId,
        reason: 'grant_revoked',
        grantId: grant.id,
      },
    });

    return {
      id: grant.id,
      status: GrantStatus.REVOKED,
      revokedAt,
    };
  }

  private resolveNormalizedTarget(dto: CreateGrantDto): {
    capabilityKey: string | null;
    resourceKey: string | null;
    actionKey: string | null;
  } {
    if (dto.targetType === GrantTargetType.CAPABILITY) {
      if (!dto.capabilityKey || dto.resourceKey || dto.actionKey) {
        throw new GrantTargetAmbiguousError();
      }

      return {
        capabilityKey: normalizeCapabilityKey(dto.capabilityKey),
        resourceKey: null,
        actionKey: null,
      };
    }

    if (dto.targetType === GrantTargetType.RESOURCE_ACTION) {
      if (!dto.resourceKey || !dto.actionKey || dto.capabilityKey) {
        throw new GrantTargetAmbiguousError();
      }

      return {
        capabilityKey: null,
        resourceKey: normalizeResourceKey(dto.resourceKey),
        actionKey: normalizeActionKey(dto.actionKey),
      };
    }

    throw new GrantTargetAmbiguousError();
  }

  private resolveValidityWindow(dto: CreateGrantDto): {
    validFrom: Date | null;
    validUntil: Date | null;
  } {
    const validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    const validUntil = dto.validUntil ? new Date(dto.validUntil) : null;

    if (validFrom && validUntil && validUntil <= validFrom) {
      throw new InvalidGrantValidityWindowError();
    }

    return { validFrom, validUntil };
  }
}
