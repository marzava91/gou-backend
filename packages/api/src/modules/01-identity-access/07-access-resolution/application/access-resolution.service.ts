// packages/api/src/modules/01-identity-and-access/07-access-resolution/application/access-resolution.service.ts

import { Inject, Injectable } from '@nestjs/common';
import { GrantEffect, OperationalSurface } from '@prisma/client';

import { ACCESS_AUTH_READER_PORT } from '../ports/access-auth-reader.port';
import type { AccessAuthReaderPort } from '../ports/access-auth-reader.port';
import { ACCESS_MEMBERSHIP_READER_PORT } from '../ports/access-membership-reader.port';
import type { AccessMembershipReaderPort } from '../ports/access-membership-reader.port';
import { ACCESS_ROLE_READER_PORT } from '../ports/access-role-reader.port';
import type { AccessRoleReaderPort } from '../ports/access-role-reader.port';
import { ACCESS_GRANT_READER_PORT } from '../ports/access-grant-reader.port';
import type { AccessGrantReaderPort } from '../ports/access-grant-reader.port';

import { AccessResolutionSupportService } from './support/access-resolution-support.service';

import {
  ACCESS_RESOLUTION_ACTIVE_SESSION_STATUSES,
  ACCESS_RESOLUTION_VALID_MEMBERSHIP_STATUSES,
} from '../domain/constants/access-resolution.constants';
import {
  AccessContextNotResolvedError,
  AuthorizationUnresolvableError,
  InvalidAccessSessionError,
  InvalidActiveMembershipError,
  MembershipScopeMismatchError,
  SurfaceScopeConflictError,
} from '../domain/errors/access-resolution.errors';
import {
  buildCapabilityKeyFromResourceAction,
  normalizeActionKey,
  normalizeCapabilityKey,
  normalizeResourceKey,
} from '../domain/rules/access-capability-normalization.rule';
import {
  grantMatchesRequestedTarget,
  isGrantCurrentlyApplicable,
} from '../domain/rules/access-grant-applicability.rule';
import {
  hasBaselineCapability,
  resolveGrantPrecedence,
} from '../domain/rules/access-decision.rule';
import { isMembershipCompatibleWithSurface } from '../domain/rules/access-scope-compatibility.rule';
import {
  AccessDecision,
  AccessEvaluationRequest,
  ActiveAccessContext,
  AuthenticatedAccessActor,
  AuthorizationMembershipAnchor,
  MembershipApplicableGrant,
  ResolvedAccessContext,
  ResolvedAuthSession,
} from '../domain/types/access-resolution.types';

@Injectable()
export class AccessResolutionService {
  constructor(
    @Inject(ACCESS_AUTH_READER_PORT)
    private readonly authReader: AccessAuthReaderPort,
    @Inject(ACCESS_MEMBERSHIP_READER_PORT)
    private readonly membershipReader: AccessMembershipReaderPort,
    @Inject(ACCESS_ROLE_READER_PORT)
    private readonly roleReader: AccessRoleReaderPort,
    @Inject(ACCESS_GRANT_READER_PORT)
    private readonly grantReader: AccessGrantReaderPort,
    private readonly support: AccessResolutionSupportService,
  ) {}

  async evaluateAccess(
    actor: AuthenticatedAccessActor,
    query: AccessEvaluationRequest,
  ): Promise<AccessDecision> {
    const at = this.support.now();

    await this.resolveValidatedSession(actor);

    const normalizedCapabilityKey = normalizeCapabilityKey(query.capabilityKey);
    const normalizedResourceKey = normalizeResourceKey(query.resourceKey);
    const normalizedActionKey = normalizeActionKey(query.actionKey);

    const resolvedCapabilityKey =
        normalizedCapabilityKey ??
        buildCapabilityKeyFromResourceAction({
        resourceKey: normalizedResourceKey,
        actionKey: normalizedActionKey,
        });

    if (!resolvedCapabilityKey) {
        throw new AuthorizationUnresolvableError();
    }

    const membership = await this.resolveValidatedMembership(actor.userId, {
        surface: query.surface,
        membershipId: query.membershipId ?? null,
    });

    const effectivePermissions = await this.resolveEffectivePermissionsState(
        membership,
        at,
    );

    const allowed = effectivePermissions.capabilityKeys.includes(
        resolvedCapabilityKey,
    );

    const decision: AccessDecision = {
        allowed,
        reasonCode: allowed ? 'access_allowed' : 'access_denied',
        surface: query.surface,
        capabilityKey: resolvedCapabilityKey,
        resourceKey: normalizedResourceKey,
        actionKey: normalizedActionKey,
        membership,
        evaluatedAt: at,
        explanation: {
        baselineMatchedCapability:
            effectivePermissions.baselineCapabilityKeys.has(
            resolvedCapabilityKey,
            ),
        matchedAllowGrantIds:
            effectivePermissions.allowGrantIdsByCapability[
            resolvedCapabilityKey
            ] ?? [],
        matchedDenyGrantIds:
            effectivePermissions.denyGrantIdsByCapability[
            resolvedCapabilityKey
            ] ?? [],
        },
    };

    await this.support.recordEvaluation({
        actorId: actor.userId,
        membershipId: membership.membershipId,
        allowed: decision.allowed,
        reasonCode: decision.reasonCode,
        capabilityKey: decision.capabilityKey,
        resourceKey: decision.resourceKey,
        actionKey: decision.actionKey,
        at,
    });

    return decision;
  }

  async resolveAccessContext(
    actor: AuthenticatedAccessActor,
    query: {
        surface: OperationalSurface;
        membershipId?: string | null;
    },
  ): Promise<ResolvedAccessContext> {
    const at = this.support.now();

    const session = await this.resolveValidatedSession(actor);

    const activeContext = await this.resolveRawActiveContext(
        actor.userId,
        query.surface,
    );

    const membership = await this.resolveValidatedMembership(actor.userId, {
        surface: query.surface,
        membershipId: query.membershipId ?? null,
    });

    const effectivePermissions = await this.resolveEffectivePermissionsState(
        membership,
        at,
    );

    await this.support.recordContextResolved({
        actorId: actor.userId,
        membershipId: membership.membershipId,
        surface: query.surface,
        effectiveCapabilityCount: effectivePermissions.capabilityKeys.length,
        at,
    });

    return {
        session,
        activeContext,
        membership,
        effectiveCapabilityKeys: effectivePermissions.capabilityKeys,
        evaluatedAt: at,
    };
  }

  async listEffectivePermissions(
    actor: AuthenticatedAccessActor,
    query: {
        surface: OperationalSurface;
        membershipId?: string | null;
    },
  ): Promise<{
    surface: OperationalSurface;
    membership: AuthorizationMembershipAnchor;
    capabilityKeys: string[];
    evaluatedAt: Date;
  }> {
    const at = this.support.now();

    await this.resolveValidatedSession(actor);

    const membership = await this.resolveValidatedMembership(actor.userId, {
        surface: query.surface,
        membershipId: query.membershipId ?? null,
    });

    const effectivePermissions = await this.resolveEffectivePermissionsState(
        membership,
        at,
    );

    await this.support.recordEffectivePermissionsComputed({
        actorId: actor.userId,
        membershipId: membership.membershipId,
        surface: query.surface,
        capabilityCount: effectivePermissions.capabilityKeys.length,
        at,
    });

    return {
        surface: query.surface,
        membership,
        capabilityKeys: effectivePermissions.capabilityKeys,
        evaluatedAt: at,
    };
  }

  private async resolveValidatedSession(
    actor: AuthenticatedAccessActor,
  ): Promise<ResolvedAuthSession> {
    const session = await this.authReader.findSessionByIdAndUserId({
      sessionId: actor.sessionId,
      userId: actor.userId,
    });

    if (
      !session ||
      !ACCESS_RESOLUTION_ACTIVE_SESSION_STATUSES.has(session.status)
    ) {
      throw new InvalidAccessSessionError();
    }

    return session;
  }

  private async resolveValidatedMembership(
    userId: string,
    query: {
      surface: OperationalSurface;
      membershipId?: string | null;
    },
  ): Promise<AuthorizationMembershipAnchor> {
    const membership = await this.resolveMembership(userId, query);

    if (!membership) {
      throw new AccessContextNotResolvedError();
    }

    if (!ACCESS_RESOLUTION_VALID_MEMBERSHIP_STATUSES.has(membership.status)) {
      throw new InvalidActiveMembershipError();
    }

    if (
      !isMembershipCompatibleWithSurface({
        membership,
        surface: query.surface,
      })
    ) {
      throw new SurfaceScopeConflictError();
    }

    return membership;
  }

  private async resolveRawActiveContext(
    userId: string,
    surface: OperationalSurface,
  ): Promise<ActiveAccessContext | null> {
    return this.authReader.getActiveContext({
      userId,
      surface,
    });
  }

  private resolveGrantCapabilityKey(
    grant: MembershipApplicableGrant,
  ): string | null {
    const normalizedCapabilityKey = normalizeCapabilityKey(grant.capabilityKey);

    if (normalizedCapabilityKey) {
        return normalizedCapabilityKey;
    }

    return buildCapabilityKeyFromResourceAction({
        resourceKey: normalizeResourceKey(grant.resourceKey),
        actionKey: normalizeActionKey(grant.actionKey),
    });
  }

  private async resolveMembership(
    userId: string,
    query: {
      surface: OperationalSurface;
      membershipId?: string | null;
    },
  ): Promise<AuthorizationMembershipAnchor | null> {
    if (query.membershipId) {
      const membership =
        await this.membershipReader.findAuthorizationAnchorByMembershipId(
          query.membershipId,
        );

      if (!membership) {
        return null;
      }

      if (membership.userId !== userId) {
        throw new MembershipScopeMismatchError();
      }

      return membership;
    }

    const activeContext = await this.authReader.getActiveContext({
      userId,
      surface: query.surface,
    });

    if (!activeContext) {
      return null;
    }

    const membership =
      await this.membershipReader.findAuthorizationAnchorByMembershipId(
        activeContext.membershipId,
      );

    if (!membership) {
      return null;
    }

    if (membership.userId !== userId) {
      throw new MembershipScopeMismatchError();
    }

    return membership;
  }

  private async resolveEffectivePermissionsState(
    membership: AuthorizationMembershipAnchor,
    at: Date,
    ): Promise<{
    capabilityKeys: string[];
    baselineCapabilityKeys: Set<string>;
    allowGrantIdsByCapability: Record<string, string[]>;
    denyGrantIdsByCapability: Record<string, string[]>;
    }> {
    const roleCapabilities =
        await this.roleReader.listActiveMembershipCapabilities(
        membership.membershipId,
        );

    const grants = await this.grantReader.listMembershipGrants(
        membership.membershipId,
    );

    const applicableGrants = grants.filter((grant) =>
        isGrantCurrentlyApplicable(grant, at),
    );

    const baselineCapabilityKeys = new Set<string>();
    const allowCapabilityKeys = new Set<string>();
    const denyCapabilityKeys = new Set<string>();

    const allowGrantIdsByCapability: Record<string, string[]> = {};
    const denyGrantIdsByCapability: Record<string, string[]> = {};

    for (const roleCapability of roleCapabilities) {
        const normalizedCapabilityKey = normalizeCapabilityKey(
        roleCapability.capabilityKey,
        );

        if (normalizedCapabilityKey) {
        baselineCapabilityKeys.add(normalizedCapabilityKey);
        }
    }

    for (const grant of applicableGrants) {
        const resolvedGrantCapabilityKey = this.resolveGrantCapabilityKey(grant);

        if (!resolvedGrantCapabilityKey) {
        continue;
        }

        if (grant.effect === GrantEffect.ALLOW) {
        allowCapabilityKeys.add(resolvedGrantCapabilityKey);

        if (!allowGrantIdsByCapability[resolvedGrantCapabilityKey]) {
            allowGrantIdsByCapability[resolvedGrantCapabilityKey] = [];
        }

        allowGrantIdsByCapability[resolvedGrantCapabilityKey].push(grant.id);
        }

        if (grant.effect === GrantEffect.DENY) {
        denyCapabilityKeys.add(resolvedGrantCapabilityKey);

        if (!denyGrantIdsByCapability[resolvedGrantCapabilityKey]) {
            denyGrantIdsByCapability[resolvedGrantCapabilityKey] = [];
        }

        denyGrantIdsByCapability[resolvedGrantCapabilityKey].push(grant.id);
        }
    }

    const effectiveCapabilityKeys = new Set<string>(baselineCapabilityKeys);

    for (const capabilityKey of allowCapabilityKeys) {
        effectiveCapabilityKeys.add(capabilityKey);
    }

    for (const capabilityKey of denyCapabilityKeys) {
        effectiveCapabilityKeys.delete(capabilityKey);
    }

    return {
        capabilityKeys: Array.from(effectiveCapabilityKeys).sort((a, b) =>
        a.localeCompare(b),
        ),
        baselineCapabilityKeys,
        allowGrantIdsByCapability,
        denyGrantIdsByCapability,
    };
  }
}