// packages/api/src/modules/01-identity-and-access/02-auth/application/auth-session.service.ts

import { Inject, Injectable } from '@nestjs/common';

import { AuthRepository } from '../auth.repository';
import { AuthResponseMapper } from '../mappers/auth-response.mapper';

import { AUTH_EVENTS_PORT } from '../ports/auth-events.port';
import type { AuthEventsPort } from '../ports/auth-events.port';

import { AUTH_TOKEN_ISSUER_PORT } from '../ports/auth-token-issuer.port';
import type { AuthTokenIssuerPort } from '../ports/auth-token-issuer.port';

import { AUTH_AUDIT_ACTIONS } from '../domain/constants/auth.constants';
import { AuthDomainEvents } from '../domain/events/auth.events';
import {
  AuthRefreshDeniedError,
  InvalidCredentialsError,
} from '../domain/errors/auth.errors';
import type { AuthenticatedAuthActor } from '../domain/types/auth.types';

import { RefreshSessionDto } from '../dto/commands/refresh-session.dto';
import { LogoutDto } from '../dto/commands/logout.dto';

import { AuthSupportService } from './support/auth-support.service';

import {
  canRefreshSession,
  canLogoutSession,
  isTerminalSessionStatus,
} from '../domain/rules/auth-session-status-transition.rule';

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authSupportService: AuthSupportService,
    @Inject(AUTH_TOKEN_ISSUER_PORT)
    private readonly tokenIssuer: AuthTokenIssuerPort,
    @Inject(AUTH_EVENTS_PORT)
    private readonly authEventsPort: AuthEventsPort,
  ) {}

  /**
   * Refreshes an existing authenticated session using a valid refresh token.
   *
   * Policy:
   * - if ROTATE_REFRESH_TOKEN is enabled, refresh must always issue a new
   *   refresh token and replace the previous refresh credential
   * - reusing the previously submitted refresh token after a successful refresh
   *   must fail because the stored refreshTokenHash has already changed
   *
   * TODO(auth-refresh-lineage):
   * When/if stronger replay protection is required, evaluate whether refresh
   * should materialize a new session lineage node using sessionFamilyId and
   * parentSessionId instead of updating the same session row in place.
   */
  async refreshSession(dto: RefreshSessionDto) {
    const refreshTokenHash = this.authSupportService.hashToken(
      dto.refreshToken,
    );

    const session =
      await this.authRepository.findSessionByRefreshTokenHash(refreshTokenHash);

    if (!session) {
      throw new AuthRefreshDeniedError();
    }

    if (!canRefreshSession(session.status)) {
      throw new AuthRefreshDeniedError();
    }

    if (!session.refreshExpiresAt || session.refreshExpiresAt <= new Date()) {
      throw new AuthRefreshDeniedError();
    }

    const accessTokenResult = await this.tokenIssuer.issueAccessToken({
      userId: session.userId,
      provider: session.provider,
      sessionId: session.id,
    });

    const refreshTokenResult = await this.tokenIssuer.issueRefreshToken({
      userId: session.userId,
      provider: session.provider,
      sessionId: session.id,
    });

    if (!refreshTokenResult?.token || !refreshTokenResult.expiresAt) {
      throw new AuthRefreshDeniedError();
    }
    const refreshedAt = new Date();

    const updatedSession = await this.authRepository.rotateSessionRefresh({
      sessionId: session.id,
      expectedRefreshTokenHash: refreshTokenHash,
      newAccessTokenHash: this.authSupportService.hashToken(
        accessTokenResult.token,
      ),
      newRefreshTokenHash: this.authSupportService.hashToken(
        refreshTokenResult.token,
      ),
      expiresAt: accessTokenResult.expiresAt,
      refreshExpiresAt: refreshTokenResult.expiresAt,
      refreshedAt,
    });

    if (!updatedSession) {
      await this.authSupportService.recordAudit(
        AUTH_AUDIT_ACTIONS.SESSION_REFRESH_FAILED,
        session.userId,
        session.userId,
        {
          sessionId: session.id,
          reason: 'refresh_token_replay_or_concurrent_update',
          operation: 'refresh_session',
          provider: session.provider,
          refreshedAt,
        },
      );

      throw new AuthRefreshDeniedError();
    }

    await this.authSupportService.recordAudit(
      AUTH_AUDIT_ACTIONS.SESSION_REFRESHED,
      session.userId,
      session.userId,
      {
        sessionId: session.id,
        refreshedAt,
        rotatedRefreshToken: true,
      },
    );

    await this.authEventsPort.publish({
      eventName: AuthDomainEvents.SESSION_REFRESHED,
      payload: {
        sessionId: session.id,
        userId: session.userId,
        refreshedAt,
        rotatedRefreshToken: true,
      },
    });

    return AuthResponseMapper.toSessionResponse({
      sessionId: updatedSession.id,
      userId: updatedSession.userId,
      provider: updatedSession.provider,
      status: updatedSession.status,
      accessToken: accessTokenResult.token,
      refreshToken: refreshTokenResult.token,
      expiresAt: updatedSession.expiresAt,
      refreshExpiresAt: updatedSession.refreshExpiresAt ?? null,
    });
  }

  /**
   * Logs out a single authenticated session.
   *
   * Policy:
   * - voluntary user logout transitions the session to LOGGED_OUT
   * - forced invalidation must use REVOKED through dedicated security/admin flows
   * Idempotency:
   * - if the session is already terminal, the operation becomes a no-op
   */

  async logout(actorUserId: string, dto: LogoutDto) {
    if (!dto.sessionId) return;

    const session = await this.authRepository.findSessionByIdAndUserId(
      dto.sessionId,
      actorUserId,
    );

    if (!session) {
      throw new InvalidCredentialsError();
    }

    if (isTerminalSessionStatus(session.status)) {
      return;
    }

    if (!canLogoutSession(session.status)) {
      throw new InvalidCredentialsError();
    }

    const loggedOutAt = new Date();

    await this.authRepository.markSessionLoggedOut(session.id, loggedOutAt);

    await this.authSupportService.recordAudit(
      AUTH_AUDIT_ACTIONS.LOGOUT_COMPLETED,
      actorUserId,
      actorUserId,
      {
        sessionId: session.id,
        loggedOutAt,
      },
    );

    await this.authEventsPort.publish({
      eventName: AuthDomainEvents.LOGOUT_COMPLETED,
      payload: {
        userId: actorUserId,
        sessionId: session.id,
        loggedOutAt,
      },
    });
  }

  /**
   * Logs out all eligible active user sessions.
   *
   * Policy:
   * - user-initiated logout-all transitions ACTIVE / REFRESHED sessions to LOGGED_OUT
   * - security/admin-driven invalidation must use REVOKED instead
   * Idempotency:
   * - if no eligible sessions remain, the operation completes with loggedOutCount = 0
   */

  async logoutAllSessions(actorUserId: string) {
    const loggedOutAt = new Date();

    const result =
      await this.authRepository.markAllActiveSessionsLoggedOutByUserId(
        actorUserId,
        loggedOutAt,
      );

    await this.authSupportService.recordAudit(
      AUTH_AUDIT_ACTIONS.LOGOUT_ALL_COMPLETED,
      actorUserId,
      actorUserId,
      {
        loggedOutCount: result.count,
        loggedOutAt,
      },
    );

    await this.authEventsPort.publish({
      eventName: AuthDomainEvents.LOGOUT_ALL_COMPLETED,
      payload: {
        userId: actorUserId,
        loggedOutAt,
        loggedOutCount: result.count,
      },
    });
  }

  async getCurrentAuthContext(actor: AuthenticatedAuthActor) {
    const session = await this.authRepository.findSessionByIdAndUserId(
      actor.sessionId,
      actor.userId,
    );

    if (!session) {
      throw new InvalidCredentialsError();
    }

    const identities = await this.authRepository.listAuthIdentitiesByUserId(
      actor.userId,
    );

    return AuthResponseMapper.toCurrentContextResponse({
      userId: actor.userId,
      sessionId: actor.sessionId,
      sessionStatus: session.status,
      identities: identities.map((identity) =>
        AuthResponseMapper.toIdentityResponse(identity),
      ),
    });
  }
}
