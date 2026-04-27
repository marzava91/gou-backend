// packages/api/src/modules/01-identity-and-access/03-memberships/application/membership-context.service.ts

import { Injectable } from '@nestjs/common';

import { MembershipsRepository } from '../memberships.repository';
import { MembershipSupportService } from './support/membership-support.service';

import { SetActiveMembershipContextDto } from '../dto/commands/set-active-membership-context.dto';

import { MEMBERSHIP_AUDIT_ACTIONS } from '../domain/constants/membership.constants';
import {
  MembershipContextDeniedError,
  MembershipNotActiveError,
} from '../domain/errors/membership.errors';
import { MembershipDomainEvents } from '../domain/events/membership.events';
import { isMembershipUsableAsActiveContext } from '../domain/rules/membership-active-eligibility.rule';

@Injectable()
export class MembershipContextService {
  constructor(
    private readonly membershipsRepository: MembershipsRepository,
    private readonly membershipSupportService: MembershipSupportService,
  ) {}

  /**
   * TODO(membership-active-context-temporal-revalidation):
   * When temporal membership windows are enabled,
   * active-context resolution should also revalidate:
   * - effectiveFrom
   * - expiresAt
   * in addition to membership status.
   *
   * This may require lazy cleanup, eager invalidation, or both.
   */

  async setActiveMembershipContext(
    userId: string,
    dto: SetActiveMembershipContextDto,
  ) {
    const membership =
      await this.membershipsRepository.findMembershipOwnedByUser({
        membershipId: dto.membershipId,
        userId,
      });

    if (!membership) {
      throw new MembershipContextDeniedError();
    }

    if (!isMembershipUsableAsActiveContext(membership.status)) {
      throw new MembershipNotActiveError();
    }

    const context = await this.membershipsRepository.upsertActiveContext({
      userId,
      surface: dto.surface,
      membershipId: membership.id,
    });

    const at = this.membershipSupportService.now();

    await this.membershipSupportService.recordAudit({
      action: MEMBERSHIP_AUDIT_ACTIONS.ACTIVE_CONTEXT_SET,
      actorId: userId,
      membershipId: membership.id,
      payload: {
        userId,
        surface: dto.surface,
        tenantId: membership.tenantId,
        storeId: membership.storeId,
      },
      at,
    });

    await this.membershipSupportService.publishEvent({
      event: MembershipDomainEvents.ACTIVE_MEMBERSHIP_CONTEXT_CHANGED,
      payload: {
        userId,
        membershipId: membership.id,
        surface: dto.surface,
        tenantId: membership.tenantId,
        storeId: membership.storeId,
      },
      at,
    });

    return {
      membershipId: membership.id,
      userId,
      surface: context.surface,
      scopeType: membership.scopeType,
      tenantId: membership.tenantId,
      storeId: membership.storeId,
      status: membership.status,
      updatedAt: context.updatedAt,
    };
  }

  /**
   * TODO(access-resolution):
   * ActiveMembershipContext is not a source of truth for authorization.
   * Consumers (Auth / future Access Resolution) must revalidate:
   * - membership ownership
   * - membership status
   * - scope consistency
   * before granting access.
   */

  async getActiveMembershipContext(
    userId: string,
    surface: SetActiveMembershipContextDto['surface'],
  ) {
    const activeContext = await this.membershipsRepository.findActiveContext({
      userId,
      surface,
    });

    if (!activeContext) {
      return null;
    }

    if (
      !activeContext.membership ||
      !isMembershipUsableAsActiveContext(activeContext.membership.status)
    ) {
      await this.membershipsRepository.clearActiveContext({
        userId,
        surface,
      });

      const at = this.membershipSupportService.now();

      await this.membershipSupportService.recordAudit({
        action: MEMBERSHIP_AUDIT_ACTIONS.ACTIVE_CONTEXT_CLEARED,
        actorId: userId,
        membershipId: activeContext.membershipId,
        payload: {
          userId,
          surface,
          reason: 'membership_no_longer_active',
        },
        at,
      });

      await this.membershipSupportService.publishEvent({
        event: MembershipDomainEvents.ACTIVE_MEMBERSHIP_CONTEXT_CLEARED,
        payload: {
          userId,
          membershipId: activeContext.membershipId,
          surface,
          reason: 'membership_no_longer_active',
        },
        at,
      });

      return null;
    }

    return {
      membershipId: activeContext.membership.id,
      userId,
      surface: activeContext.surface,
      scopeType: activeContext.membership.scopeType,
      tenantId: activeContext.membership.tenantId,
      storeId: activeContext.membership.storeId,
      status: activeContext.membership.status,
      updatedAt: activeContext.updatedAt,
    };
  }
}
