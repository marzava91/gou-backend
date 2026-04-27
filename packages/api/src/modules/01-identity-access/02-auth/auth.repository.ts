// packages\api\src\modules\01-identity-access\02-auth\auth.repository.ts

import {
  AuthProvider,
  AuthSessionStatus,
  AuthVerificationChallengePurpose,
  AuthVerificationChallengeStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

import { Injectable } from '@nestjs/common';
import { PASSWORD_RESET_ALLOWED_PROVIDERS } from './domain/constants/auth.constants';

export type VerificationChallengeData = {
  id: string;
  userId: string | null;
  authIdentityId: string | null;
  purpose: AuthVerificationChallengePurpose;
  status: AuthVerificationChallengeStatus;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
};

export type PasswordResetChallengeData = {
  id: string;
  userId: string | null;
  authIdentityId: string | null;
  purpose: AuthVerificationChallengePurpose;
  status: AuthVerificationChallengeStatus;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
};

export type ConsumeVerificationChallengeResult =
  | { outcome: 'consumed'; challenge: VerificationChallengeData }
  | { outcome: 'not_found' }
  | { outcome: 'expired'; challenge?: VerificationChallengeData }
  | { outcome: 'already_used'; challenge?: VerificationChallengeData }
  | { outcome: 'too_many_attempts'; challenge?: VerificationChallengeData }
  | {
      outcome: 'invalid_code';
      attempts: number;
      challenge?: VerificationChallengeData;
    };

export type ConsumePasswordResetChallengeResult =
  | { outcome: 'consumed'; challenge: PasswordResetChallengeData }
  | { outcome: 'not_found' }
  | { outcome: 'expired'; challenge?: PasswordResetChallengeData }
  | { outcome: 'already_used'; challenge?: PasswordResetChallengeData }
  | { outcome: 'too_many_attempts'; challenge?: PasswordResetChallengeData }
  | {
      outcome: 'invalid_code';
      attempts: number;
      challenge?: PasswordResetChallengeData;
    };

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAuthIdentityByProvider(
    provider: AuthProvider,
    providerSubject: string,
  ) {
    return this.prisma.authIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider,
          providerSubject,
        },
      },
    });
  }

  async findUserAuthProfileById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
      },
    });
  }

  /**
   * Returns all canonical userIds that match a verified email signal.
   *
   * Resolution policy for this phase:
   * - auto-link candidate resolution must use canonical User data only
   * - email must match User.primaryEmail
   * - the canonical email must already be verified
   *
   * We return all matching userIds so the application layer can detect
   * ambiguity and avoid unsafe auto-linking.
   */
  async findCandidateUserIdsByVerifiedEmail(email: string): Promise<string[]> {
    const userMatches = await this.prisma.user.findMany({
      where: {
        primaryEmail: email,
        emailVerified: true,
      },
      select: {
        id: true,
      },
    });

    return userMatches.map((row) => row.id);
  }

  /**
   * Returns all canonical userIds that match a verified phone signal.
   *
   * Resolution policy for this phase:
   * - auto-link candidate resolution must use canonical User data only
   * - phone must match User.primaryPhone
   * - the canonical phone must already be verified
   *
   * We return all matching userIds so the application layer can detect
   * ambiguity and avoid unsafe auto-linking.
   */
  async findCandidateUserIdsByVerifiedPhone(phone: string): Promise<string[]> {
    const userMatches = await this.prisma.user.findMany({
      where: {
        primaryPhone: phone,
        phoneVerified: true,
      },
      select: {
        id: true,
      },
    });

    return userMatches.map((row) => row.id);
  }

  async createAuthSession(data: {
    userId: string;
    authIdentityId?: string | null;
    provider: AuthProvider;
    status: AuthSessionStatus;
    accessTokenHash?: string | null;
    refreshTokenHash?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceName?: string | null;
    expiresAt: Date;
    refreshExpiresAt?: Date | null;
  }) {
    return this.prisma.authSession.create({ data });
  }

  async findSessionById(sessionId: string) {
    return this.prisma.authSession.findUnique({
      where: { id: sessionId },
    });
  }

  async findSessionByIdAndUserId(sessionId: string, userId: string) {
    return this.prisma.authSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });
  }

  async revokeSession(sessionId: string, revokedAt: Date) {
    return this.prisma.authSession.update({
      where: { id: sessionId },
      data: {
        status: AuthSessionStatus.REVOKED,
        revokedAt,
      },
    });
  }

  async revokeAllActiveSessionsByUserId(userId: string, revokedAt: Date) {
    return this.prisma.authSession.updateMany({
      where: {
        userId,
        status: {
          in: [
            AuthSessionStatus.ISSUED,
            AuthSessionStatus.ACTIVE,
            AuthSessionStatus.REFRESHED,
          ],
        },
      },
      data: {
        status: AuthSessionStatus.REVOKED,
        revokedAt,
      },
    });
  }

  async listAuthIdentitiesByUserId(userId: string) {
    return this.prisma.authIdentity.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findSessionByRefreshTokenHash(refreshTokenHash: string) {
    return this.prisma.authSession.findFirst({
      where: {
        refreshTokenHash,
      },
    });
  }

  async rotateSessionRefresh(params: {
    sessionId: string;
    expectedRefreshTokenHash: string;
    newAccessTokenHash: string;
    newRefreshTokenHash: string;
    expiresAt: Date;
    refreshExpiresAt: Date;
    refreshedAt: Date;
  }) {
    const result = await this.prisma.authSession.updateMany({
      where: {
        id: params.sessionId,
        refreshTokenHash: params.expectedRefreshTokenHash,
        status: {
          in: [
            AuthSessionStatus.ISSUED,
            AuthSessionStatus.ACTIVE,
            AuthSessionStatus.REFRESHED,
          ],
        },
        revokedAt: null,
        loggedOutAt: null,
        refreshExpiresAt: {
          gt: new Date(),
        },
      },
      data: {
        status: AuthSessionStatus.REFRESHED,
        accessTokenHash: params.newAccessTokenHash,
        refreshTokenHash: params.newRefreshTokenHash,
        expiresAt: params.expiresAt,
        refreshExpiresAt: params.refreshExpiresAt,
        lastRefreshedAt: params.refreshedAt,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.prisma.authSession.findUnique({
      where: { id: params.sessionId },
    });
  }

  async findRefreshableSessionByRefreshTokenHash(refreshTokenHash: string) {
    return this.prisma.authSession.findFirst({
      where: {
        refreshTokenHash,
        status: {
          in: [
            AuthSessionStatus.ISSUED,
            AuthSessionStatus.ACTIVE,
            AuthSessionStatus.REFRESHED,
          ],
        },
      },
    });
  }

  async createVerificationChallenge(data: {
    userId?: string | null;
    authIdentityId?: string | null;
    purpose: AuthVerificationChallengePurpose;
    status: AuthVerificationChallengeStatus;
    target?: string | null;
    codeHash: string;
    verificationRef?: string | null;
    maxAttempts: number;
    expiresAt: Date;
  }) {
    return this.prisma.authVerificationChallenge.create({
      data,
    });
  }

  async findVerificationChallengeById(challengeId: string) {
    return this.prisma.authVerificationChallenge.findUnique({
      where: { id: challengeId },
    });
  }

  async findAuthIdentityForPasswordReset(identifier: string) {
    return this.prisma.authIdentity.findFirst({
      where: {
        OR: [
          { email: identifier, emailVerified: true },
          { phone: identifier, phoneVerified: true },
        ],
        provider: {
          in: [...PASSWORD_RESET_ALLOWED_PROVIDERS],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAuthIdentityById(authIdentityId: string) {
    return this.prisma.authIdentity.findUnique({
      where: { id: authIdentityId },
    });
  }

  /**
   * Verification success path policy for this phase:
   *
   * - successful verifyCode() consumes the challenge immediately
   * - validatedAt and consumedAt are written in the same transition
   * - therefore verifyCode() does NOT materialize VALIDATED as an intermediate
   *   persisted state in this flow
   *
   * VALIDATED remains reserved for future flows, if any, that require
   * "validated but not yet consumed" semantics.
   */
  async consumeVerificationChallengeIfValid(params: {
    challengeId: string;
    expectedCodeHash: string;
    now: Date;
    expectedPurpose?: AuthVerificationChallengePurpose;
  }): Promise<ConsumeVerificationChallengeResult> {
    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.authVerificationChallenge.findUnique({
        where: { id: params.challengeId },
        select: {
          id: true,
          userId: true,
          authIdentityId: true,
          purpose: true,
          status: true,
          codeHash: true,
          attempts: true,
          maxAttempts: true,
          expiresAt: true,
        },
      });

      if (!challenge) {
        return { outcome: 'not_found' };
      }

      if (
        params.expectedPurpose &&
        challenge.purpose !== params.expectedPurpose
      ) {
        return { outcome: 'not_found' };
      }

      switch (challenge.status) {
        case AuthVerificationChallengeStatus.VALIDATED:
        case AuthVerificationChallengeStatus.CONSUMED:
          return { outcome: 'already_used', challenge };

        case AuthVerificationChallengeStatus.EXPIRED:
          return { outcome: 'expired', challenge };

        case AuthVerificationChallengeStatus.FAILED:
          return { outcome: 'too_many_attempts', challenge };

        case AuthVerificationChallengeStatus.ISSUED:
          break;
      }

      if (challenge.expiresAt <= params.now) {
        const expired = await tx.authVerificationChallenge.updateMany({
          where: {
            id: challenge.id,
            status: AuthVerificationChallengeStatus.ISSUED,
          },
          data: {
            status: AuthVerificationChallengeStatus.EXPIRED,
          },
        });

        return expired.count > 0
          ? { outcome: 'expired', challenge }
          : { outcome: 'already_used', challenge };
      }

      if (challenge.attempts >= challenge.maxAttempts) {
        const failed = await tx.authVerificationChallenge.updateMany({
          where: {
            id: challenge.id,
            status: AuthVerificationChallengeStatus.ISSUED,
          },
          data: {
            status: AuthVerificationChallengeStatus.FAILED,
            failedAt: params.now,
            attempts: challenge.attempts,
          },
        });

        return failed.count > 0
          ? { outcome: 'too_many_attempts', challenge }
          : { outcome: 'already_used', challenge };
      }

      if (params.expectedCodeHash !== challenge.codeHash) {
        const nextAttempts = challenge.attempts + 1;

        if (nextAttempts >= challenge.maxAttempts) {
          const failed = await tx.authVerificationChallenge.updateMany({
            where: {
              id: challenge.id,
              status: AuthVerificationChallengeStatus.ISSUED,
              attempts: challenge.attempts,
            },
            data: {
              status: AuthVerificationChallengeStatus.FAILED,
              failedAt: params.now,
              attempts: nextAttempts,
            },
          });

          return failed.count > 0
            ? { outcome: 'too_many_attempts', challenge }
            : { outcome: 'already_used', challenge };
        }

        const incremented = await tx.authVerificationChallenge.updateMany({
          where: {
            id: challenge.id,
            status: AuthVerificationChallengeStatus.ISSUED,
            attempts: challenge.attempts,
          },
          data: {
            attempts: {
              increment: 1,
            },
          },
        });

        return incremented.count > 0
          ? { outcome: 'invalid_code', attempts: nextAttempts, challenge }
          : { outcome: 'already_used', challenge };
      }

      const consumed = await tx.authVerificationChallenge.updateMany({
        where: {
          id: challenge.id,
          status: AuthVerificationChallengeStatus.ISSUED,
          attempts: challenge.attempts,
        },
        data: {
          status: AuthVerificationChallengeStatus.CONSUMED,
          validatedAt: params.now,
          consumedAt: params.now,
        },
      });

      if (consumed.count > 0) {
        return { outcome: 'consumed', challenge };
      }

      const latest = await tx.authVerificationChallenge.findUnique({
        where: { id: challenge.id },
        select: {
          id: true,
          userId: true,
          authIdentityId: true,
          purpose: true,
          status: true,
          codeHash: true,
          attempts: true,
          maxAttempts: true,
          expiresAt: true,
        },
      });

      if (!latest) {
        return { outcome: 'not_found' };
      }

      if (
        latest.status === AuthVerificationChallengeStatus.VALIDATED ||
        latest.status === AuthVerificationChallengeStatus.CONSUMED
      ) {
        return { outcome: 'already_used', challenge: latest };
      }

      if (latest.status === AuthVerificationChallengeStatus.EXPIRED) {
        return { outcome: 'expired', challenge: latest };
      }

      if (latest.status === AuthVerificationChallengeStatus.FAILED) {
        return { outcome: 'too_many_attempts', challenge: latest };
      }

      return { outcome: 'already_used', challenge: latest };
    });
  }

  async consumePasswordResetChallengeIfValid(params: {
    challengeId: string;
    expectedCodeHash: string;
    now: Date;
  }): Promise<ConsumePasswordResetChallengeResult> {
    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.authVerificationChallenge.findUnique({
        where: { id: params.challengeId },
        select: {
          id: true,
          userId: true,
          authIdentityId: true,
          purpose: true,
          status: true,
          codeHash: true,
          attempts: true,
          maxAttempts: true,
          expiresAt: true,
        },
      });

      if (!challenge) {
        return { outcome: 'not_found' };
      }

      if (
        challenge.purpose !== AuthVerificationChallengePurpose.PASSWORD_RESET
      ) {
        return { outcome: 'not_found' };
      }

      switch (challenge.status) {
        case AuthVerificationChallengeStatus.VALIDATED:
        case AuthVerificationChallengeStatus.CONSUMED:
          return { outcome: 'already_used', challenge };

        case AuthVerificationChallengeStatus.EXPIRED:
          return { outcome: 'expired', challenge };

        case AuthVerificationChallengeStatus.FAILED:
          return { outcome: 'too_many_attempts', challenge };

        case AuthVerificationChallengeStatus.ISSUED:
          break;
      }

      if (challenge.expiresAt <= params.now) {
        const expired = await tx.authVerificationChallenge.updateMany({
          where: {
            id: challenge.id,
            status: AuthVerificationChallengeStatus.ISSUED,
          },
          data: {
            status: AuthVerificationChallengeStatus.EXPIRED,
          },
        });

        return expired.count > 0
          ? { outcome: 'expired', challenge }
          : { outcome: 'already_used', challenge };
      }

      if (challenge.attempts >= challenge.maxAttempts) {
        const failed = await tx.authVerificationChallenge.updateMany({
          where: {
            id: challenge.id,
            status: AuthVerificationChallengeStatus.ISSUED,
          },
          data: {
            status: AuthVerificationChallengeStatus.FAILED,
            failedAt: params.now,
            attempts: challenge.attempts,
          },
        });

        return failed.count > 0
          ? { outcome: 'too_many_attempts', challenge }
          : { outcome: 'already_used', challenge };
      }

      if (params.expectedCodeHash !== challenge.codeHash) {
        const nextAttempts = challenge.attempts + 1;

        if (nextAttempts >= challenge.maxAttempts) {
          const failed = await tx.authVerificationChallenge.updateMany({
            where: {
              id: challenge.id,
              status: AuthVerificationChallengeStatus.ISSUED,
              attempts: challenge.attempts,
            },
            data: {
              status: AuthVerificationChallengeStatus.FAILED,
              failedAt: params.now,
              attempts: nextAttempts,
            },
          });

          return failed.count > 0
            ? { outcome: 'too_many_attempts', challenge }
            : { outcome: 'already_used', challenge };
        }

        const incremented = await tx.authVerificationChallenge.updateMany({
          where: {
            id: challenge.id,
            status: AuthVerificationChallengeStatus.ISSUED,
            attempts: challenge.attempts,
          },
          data: {
            attempts: {
              increment: 1,
            },
          },
        });

        return incremented.count > 0
          ? { outcome: 'invalid_code', attempts: nextAttempts, challenge }
          : { outcome: 'already_used', challenge };
      }

      const consumed = await tx.authVerificationChallenge.updateMany({
        where: {
          id: challenge.id,
          status: AuthVerificationChallengeStatus.ISSUED,
        },
        data: {
          status: AuthVerificationChallengeStatus.CONSUMED,
          validatedAt: params.now,
          consumedAt: params.now,
        },
      });

      if (consumed.count === 0) {
        return { outcome: 'already_used', challenge };
      }

      return {
        outcome: 'consumed',
        challenge,
      };
    });
  }

  async findAuthIdentityByUserIdAndProvider(
    userId: string,
    provider: AuthProvider,
  ) {
    return this.prisma.authIdentity.findFirst({
      where: {
        userId,
        provider,
      },
    });
  }

  async createAuthIdentity(data: {
    userId: string;
    provider: AuthProvider;
    providerSubject: string;
    email?: string | null;
    phone?: string | null;
    emailVerified?: boolean;
    phoneVerified?: boolean;
  }) {
    return this.prisma.authIdentity.create({
      data,
    });
  }

  async deleteAuthIdentity(authIdentityId: string) {
    return this.prisma.authIdentity.delete({
      where: { id: authIdentityId },
    });
  }

  async countAuthIdentitiesByUserId(userId: string) {
    return this.prisma.authIdentity.count({
      where: { userId },
    });
  }

  async markSessionLoggedOut(sessionId: string, loggedOutAt: Date) {
    return this.prisma.authSession.update({
      where: { id: sessionId },
      data: {
        status: AuthSessionStatus.LOGGED_OUT,
        loggedOutAt,
      },
    });
  }

  async markAllActiveSessionsLoggedOutByUserId(
    userId: string,
    loggedOutAt: Date,
  ) {
    return this.prisma.authSession.updateMany({
      where: {
        userId,
        status: {
          in: [
            AuthSessionStatus.ISSUED,
            AuthSessionStatus.ACTIVE,
            AuthSessionStatus.REFRESHED,
          ],
        },
      },
      data: {
        status: AuthSessionStatus.LOGGED_OUT,
        loggedOutAt,
      },
    });
  }
}
