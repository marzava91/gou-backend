import { Inject, Injectable } from '@nestjs/common';
import { 
    InvitationStatus, 
    MembershipScopeType, 
    Prisma 
} from '@prisma/client';

import { InvitationsRepository } from '../invitations.repository';
import { InvitationTokenService } from './invitation-token.service';
import { InvitationSupportService } from './support/invitation-support.service';

import {
  INVITATION_AUDIT_ACTIONS,
  INVITATION_OPERATIONAL_LIMITS,
} from '../domain/constants/invitation.constants';
import { InvitationDomainEvents } from '../domain/events/invitation.events';
import {
  normalizeInvitationRecipient,
  recipientMatches,
} from '../domain/rules/invitation-recipient-normalization.rule';
import { canTransitionInvitationStatus } from '../domain/rules/invitation-status-transition.rule';
import {
  InvitationNotFoundError,
  InvitationRecipientMismatchError,
  InvalidInvitationExpirationError,
  InvalidInvitationScopeError,
  InvalidInvitationStatusTransitionError,
  InvalidInvitationTokenError,
  EquivalentActiveInvitationExistsError,
} from '../domain/errors/invitation.errors';

import {
  INVITATION_NOTIFICATION_PORT,
  type InvitationNotificationPort,
} from '../ports/invitation-notification.port';
import {
  INVITATION_USER_RESOLUTION_PORT,
  type InvitationUserResolutionPort,
} from '../ports/invitation-user-resolution.port';

import { CreateInvitationDto } from '../dto/commands/create-invitation.dto';
import { ResendInvitationDto } from '../dto/commands/resend-invitation.dto';
import { RevokeInvitationDto } from '../dto/commands/revoke-invitation.dto';
import { AcceptInvitationDto } from '../dto/commands/accept-invitation.dto';
import { DeclineInvitationDto } from '../dto/commands/decline-invitation.dto';
import { CancelInvitationDto } from '../dto/commands/cancel-invitation.dto';

@Injectable()
export class InvitationCommandService {
  constructor(
    private readonly repository: InvitationsRepository,
    private readonly tokenService: InvitationTokenService,
    private readonly support: InvitationSupportService,
    @Inject(INVITATION_NOTIFICATION_PORT)
    private readonly notifications: InvitationNotificationPort,
    @Inject(INVITATION_USER_RESOLUTION_PORT)
    private readonly userResolution: InvitationUserResolutionPort,
  ) {}

  async createInvitation(actorUserId: string | null, dto: CreateInvitationDto) {
    const recipientValue = normalizeInvitationRecipient(
        dto.recipientType,
        dto.recipientValue,
    );

    const scope = this.assertValidScope({
        scopeType: dto.scopeType,
        tenantId: dto.tenantId,
        storeId: dto.storeId,
    });

    const now = new Date();

    const expiresAt = dto.expiresAt
        ? new Date(dto.expiresAt)
        : new Date(
            now.getTime() +
            INVITATION_OPERATIONAL_LIMITS.DEFAULT_TTL_HOURS * 60 * 60 * 1000,
        );

    if (Number.isNaN(expiresAt.getTime())) {
        throw new InvalidInvitationExpirationError(
        'invalid_invitation_expiration',
        );
    }

    if (expiresAt.getTime() <= now.getTime()) {
        throw new InvalidInvitationExpirationError(
        'invitation_expiration_must_be_future',
        );
    }

    const ttlMs = expiresAt.getTime() - now.getTime();
    const minTtlMs =
        INVITATION_OPERATIONAL_LIMITS.MIN_TTL_MINUTES * 60 * 1000;
    const maxTtlMs =
        INVITATION_OPERATIONAL_LIMITS.MAX_TTL_HOURS * 60 * 60 * 1000;

    if (ttlMs < minTtlMs) {
        throw new InvalidInvitationExpirationError(
        'invitation_ttl_below_minimum',
        );
    }

    if (ttlMs > maxTtlMs) {
        throw new InvalidInvitationExpirationError(
        'invitation_ttl_exceeds_maximum',
        );
    }

    const equivalent = await this.repository.findEquivalentActiveInvitation({
        recipientType: dto.recipientType,
        recipientValue,
        scopeType: dto.scopeType,
        tenantId: scope.tenantId,
        storeId: scope.storeId,
    });

    if (equivalent) {
        throw new EquivalentActiveInvitationExistsError();
    }

    const metadata = dto.metadata as Prisma.InputJsonValue | undefined;

    const created = await this.repository.createInvitation({
        recipientType: dto.recipientType,
        recipientValue,
        scopeType: dto.scopeType,
        tenantId: scope.tenantId,
        storeId: scope.storeId,
        proposedRoleKey: dto.proposedRoleKey ?? null,
        metadata,
        status: InvitationStatus.PROPOSED,
        expiresAt,
        createdBy: actorUserId,
    });

    await this.repository.createHistory({
        invitationId: created.id,
        fromStatus: null,
        toStatus: InvitationStatus.PROPOSED,
        changedBy: actorUserId,
        reason: 'invitation_created',
    });

    const tokenPayload = this.tokenService.generate(created.id, expiresAt);
    const tokenHash = this.tokenService.hash(tokenPayload.token);

    const sentAt = new Date();

    const sent = await this.repository.updateByIdAndVersion(
        created.id,
        created.version,
        {
        status: InvitationStatus.SENT,
        currentTokenHash: tokenHash,
        currentTokenIssuedAt: sentAt,
        sentAt,
        },
    );

    if (!sent) {
        throw new InvalidInvitationStatusTransitionError();
    }

    await this.repository.createHistory({
        invitationId: sent.id,
        fromStatus: InvitationStatus.PROPOSED,
        toStatus: InvitationStatus.SENT,
        changedBy: actorUserId,
        reason: 'invitation_sent',
    });

    await this.notifications.sendInvitation({
        invitationId: sent.id,
        recipientType: sent.recipientType,
        recipientValue: sent.recipientValue,
        token: tokenPayload.token,
        expiresAt: sent.expiresAt,
    });

    await this.support.recordAudit(
        INVITATION_AUDIT_ACTIONS.INVITATION_CREATED,
        actorUserId,
        sent.id,
        {
        recipientType: sent.recipientType,
        tenantId: sent.tenantId,
        storeId: sent.storeId,
        scopeType: sent.scopeType,
        },
    );

    await this.support.recordAudit(
        INVITATION_AUDIT_ACTIONS.INVITATION_SENT,
        actorUserId,
        sent.id,
        {
        recipientType: sent.recipientType,
        tenantId: sent.tenantId,
        storeId: sent.storeId,
        scopeType: sent.scopeType,
        },
    );

    await this.support.publishEvent(
        InvitationDomainEvents.INVITATION_CREATED,
        {
        invitationId: sent.id,
        recipientType: sent.recipientType,
        scopeType: sent.scopeType,
        tenantId: sent.tenantId,
        storeId: sent.storeId,
        },
    );

    await this.support.publishEvent(
        InvitationDomainEvents.INVITATION_SENT,
        {
        invitationId: sent.id,
        recipientType: sent.recipientType,
        scopeType: sent.scopeType,
        tenantId: sent.tenantId,
        storeId: sent.storeId,
        expiresAt: sent.expiresAt,
        },
    );

    return {
        invitation: sent,
        token: tokenPayload.token,
    };
  }

  async revokeInvitation(
    actorUserId: string | null,
    invitationId: string,
    dto: RevokeInvitationDto,
  ) {
    const invitation = await this.repository.findById(invitationId);
    if (!invitation) {
      throw new InvitationNotFoundError();
    }

    if (
      !canTransitionInvitationStatus(
        invitation.status,
        InvitationStatus.REVOKED,
      )
    ) {
      throw new InvalidInvitationStatusTransitionError();
    }

    const revokedAt = new Date();

    const updated = await this.repository.updateByIdAndVersion(
      invitation.id,
      invitation.version,
      {
        status: InvitationStatus.REVOKED,
        revokedBy: actorUserId,
        revokedAt,
        currentTokenHash: null,
      },
    );

    if (!updated) {
      throw new InvalidInvitationStatusTransitionError();
    }

    await this.repository.createHistory({
      invitationId: updated.id,
      fromStatus: invitation.status,
      toStatus: InvitationStatus.REVOKED,
      changedBy: actorUserId,
      reason: dto.reason ?? null,
    });

    await this.support.recordAudit(
      INVITATION_AUDIT_ACTIONS.INVITATION_REVOKED,
      actorUserId,
      updated.id,
      {
        reason: dto.reason ?? null,
      },
    );

    await this.support.publishEvent(InvitationDomainEvents.INVITATION_REVOKED, {
      invitationId: updated.id,
    });

    return updated;
  }

  async cancelInvitation(
    actorUserId: string | null,
    invitationId: string,
    dto: CancelInvitationDto,
  ) {
    const invitation = await this.repository.findById(invitationId);
    if (!invitation) {
      throw new InvitationNotFoundError();
    }

    if (
      !canTransitionInvitationStatus(
        invitation.status,
        InvitationStatus.CANCELED,
      )
    ) {
      throw new InvalidInvitationStatusTransitionError();
    }

    const canceledAt = new Date();

    const updated = await this.repository.updateByIdAndVersion(
      invitation.id,
      invitation.version,
      {
        status: InvitationStatus.CANCELED,
        canceledAt,
        canceledBy: actorUserId,
        currentTokenHash: null,
      },
    );

    if (!updated) {
      throw new InvalidInvitationStatusTransitionError();
    }

    await this.repository.createHistory({
      invitationId: updated.id,
      fromStatus: invitation.status,
      toStatus: InvitationStatus.CANCELED,
      changedBy: actorUserId,
      reason: dto.reason ?? null,
    });

    await this.support.recordAudit(
      INVITATION_AUDIT_ACTIONS.INVITATION_CANCELED,
      actorUserId,
      updated.id,
      {
        reason: dto.reason ?? null,
      },
    );

    await this.support.publishEvent(
      InvitationDomainEvents.INVITATION_CANCELED,
      {
        invitationId: updated.id,
      },
    );

    return updated;
  }

  async declineInvitation(invitationId: string, dto: DeclineInvitationDto) {
    const invitation = await this.repository.findById(invitationId);
    if (!invitation) {
      throw new InvitationNotFoundError();
    }

    if (
      !canTransitionInvitationStatus(
        invitation.status,
        InvitationStatus.DECLINED,
      )
    ) {
      throw new InvalidInvitationStatusTransitionError();
    }

    const declinedAt = new Date();

    const updated = await this.repository.updateByIdAndVersion(
      invitation.id,
      invitation.version,
      {
        status: InvitationStatus.DECLINED,
        declinedAt,
        currentTokenHash: null,
      },
    );

    if (!updated) {
      throw new InvalidInvitationStatusTransitionError();
    }

    await this.repository.createHistory({
      invitationId: updated.id,
      fromStatus: invitation.status,
      toStatus: InvitationStatus.DECLINED,
      changedBy: null,
      reason: dto.reason ?? null,
    });

    await this.support.recordAudit(
      INVITATION_AUDIT_ACTIONS.INVITATION_DECLINED,
      null,
      updated.id,
      {
        reason: dto.reason ?? null,
      },
    );

    await this.support.publishEvent(
      InvitationDomainEvents.INVITATION_DECLINED,
      {
        invitationId: updated.id,
      },
    );

    return updated;
  }

  async acceptInvitationByToken(token: string, dto: AcceptInvitationDto) {
    const tokenHash = this.tokenService.hash(token);

    const invitation = await this.repository.findByTokenHash(tokenHash);
    if (!invitation) {
        throw new InvalidInvitationTokenError();
    }

    if (invitation.status !== InvitationStatus.SENT) {
        throw new InvalidInvitationStatusTransitionError();
    }

    await this.support.expireInvitationIfNeeded(invitation, this.repository);

    this.support.assertInvitationAcceptable(invitation);

    if (
        !recipientMatches(
        invitation.recipientType,
        invitation.recipientValue,
        dto.recipientValue,
        )
    ) {
        throw new InvitationRecipientMismatchError();
    }

    const resolvedUser =
        await this.userResolution.resolveOrCreateUserByRecipient({
        recipientType: invitation.recipientType,
        recipientValue: invitation.recipientValue,
        });

    const result = await this.repository.acceptInvitationTransaction({
        invitationId: invitation.id,
        acceptedByUserId: resolvedUser.userId,
        recipientType: invitation.recipientType,
        recipientValue: invitation.recipientValue,
        scopeType: invitation.scopeType,
        tenantId: invitation.tenantId,
        storeId: invitation.storeId,
    });

    await this.support.recordAccepted(
        result.invitation.id,
        resolvedUser.userId,
        {
        membershipId: result.membershipId,
        createdUser: resolvedUser.created,
        },
    );

    await this.support.recordAudit(
        INVITATION_AUDIT_ACTIONS.INVITATION_MEMBERSHIP_CONVERTED,
        resolvedUser.userId,
        result.invitation.id,
        { membershipId: result.membershipId },
    );

    await this.support.publishEvent(
        InvitationDomainEvents.INVITATION_CONVERTED_TO_MEMBERSHIP,
        {
        invitationId: result.invitation.id,
        membershipId: result.membershipId,
        acceptedByUserId: resolvedUser.userId,
        },
    );

    return {
        invitation: result.invitation,
        membershipId: result.membershipId,
        accepted: true,
        idempotent: result.idempotent,
    };
  }

  async resendInvitation(
    actorUserId: string | null,
    invitationId: string,
    dto: ResendInvitationDto,
  ) {
    const invitation = await this.repository.findById(invitationId);

    if (!invitation) {
      throw new InvitationNotFoundError();
    }

    if (invitation.status !== InvitationStatus.SENT) {
      throw new InvalidInvitationStatusTransitionError();
    }

    await this.support.expireInvitationIfNeeded(invitation, this.repository);

    this.support.assertInvitationAcceptable(invitation);

    const tokenPayload = this.tokenService.generate(
      invitation.id,
      invitation.expiresAt,
    );
    const tokenHash = this.tokenService.hash(tokenPayload.token);
    const resentAt = new Date();

    const updated = await this.repository.updateByIdAndVersion(
      invitation.id,
      invitation.version,
      {
        currentTokenHash: tokenHash,
        currentTokenIssuedAt: resentAt,
        sentAt: resentAt,
      },
    );

    if (!updated) {
      throw new InvalidInvitationStatusTransitionError();
    }

    await this.repository.createHistory({
      invitationId: updated.id,
      fromStatus: InvitationStatus.SENT,
      toStatus: InvitationStatus.SENT,
      changedBy: actorUserId,
      reason: dto.reason ?? 'invitation_resent',
    });

    await this.notifications.sendInvitation({
      invitationId: updated.id,
      recipientType: updated.recipientType,
      recipientValue: updated.recipientValue,
      token: tokenPayload.token,
      expiresAt: updated.expiresAt,
    });

    await this.support.recordAudit(
      INVITATION_AUDIT_ACTIONS.INVITATION_RESENT,
      actorUserId,
      updated.id,
      {
        reason: dto.reason ?? null,
        resentAt,
        expiresAt: updated.expiresAt,
      },
    );

    await this.support.publishEvent(
      InvitationDomainEvents.INVITATION_RESENT,
      {
        invitationId: updated.id,
        expiresAt: updated.expiresAt,
        resentAt,
      },
    );

    return {
      invitation: updated,
      token: tokenPayload.token,
    };
  }

  async expireDueInvitations(now: Date = new Date()) {
    const expiredInvitations = await this.repository.expireDueInvitations(now);

    for (const invitation of expiredInvitations) {
      await this.support.recordAudit(
        INVITATION_AUDIT_ACTIONS.INVITATION_EXPIRED,
        null,
        invitation.id,
        {
          expiredAt: invitation.expiredAt,
          expiresAt: invitation.expiresAt,
        },
      );

      await this.support.publishEvent(
        InvitationDomainEvents.INVITATION_EXPIRED,
        {
          invitationId: invitation.id,
          expiredAt: invitation.expiredAt,
          expiresAt: invitation.expiresAt,
        },
      );
    }

    return {
      expiredCount: expiredInvitations.length,
      items: expiredInvitations,
    };
  }

  private assertValidScope(input: {
    scopeType: MembershipScopeType;
    tenantId: string;
    storeId?: string | null;
  }) {
    const tenantId = input.tenantId?.trim();
    const storeId =
        typeof input.storeId === 'string' ? input.storeId.trim() : input.storeId;

    if (!tenantId) {
        throw new InvalidInvitationScopeError('invalid_invitation_scope');
    }

    if (input.scopeType === MembershipScopeType.TENANT) {
        if (storeId) {
        throw new InvalidInvitationScopeError(
            'tenant_scope_must_not_include_store',
        );
        }

        return {
        tenantId,
        storeId: null,
        };
    }

    if (input.scopeType === MembershipScopeType.STORE) {
        if (!storeId) {
        throw new InvalidInvitationScopeError(
            'store_scope_requires_store_id',
        );
        }

        return {
        tenantId,
        storeId,
        };
    }

    throw new InvalidInvitationScopeError('invalid_invitation_scope');
  }
}