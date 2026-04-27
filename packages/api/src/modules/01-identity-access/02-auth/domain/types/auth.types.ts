// packages\api\src\modules\01-identity-and-access\02-auth\domain\types\auth.types.ts

import type {
  AuthProvider,
  AuthSessionStatus,
  AuthVerificationChallengePurpose,
  AuthVerificationChallengeStatus,
} from '@prisma/client';

export type AuthenticatedAuthActor = {
  userId: string;
  sessionId: string;
  authIdentityId?: string | null;
  provider?: AuthProvider | null;
};

export type ProviderAuthenticationResult = {
  provider: AuthProvider;
  providerSubject: string;

  broker?: AuthProvider | null;
  firebaseUid?: string | null;

  email?: string | null;
  emailVerified?: boolean;

  phone?: string | null;
  phoneVerified?: boolean;

  displayName?: string | null;
  avatarUrl?: string | null;
};

export type IssueAuthSessionInput = {
  userId: string;
  authIdentityId?: string | null;
  provider: AuthProvider;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceName?: string | null;
};

export type IssuedAuthSession = {
  sessionId: string;
  userId: string;
  authIdentityId?: string | null;
  provider: AuthProvider;
  status: AuthSessionStatus;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: Date;
  refreshExpiresAt?: Date | null;
};

export type VerificationChallengePayload = {
  challengeId: string;
  userId?: string | null;
  authIdentityId?: string | null;
  purpose: AuthVerificationChallengePurpose;
  status: AuthVerificationChallengeStatus;
  target?: string | null;
  expiresAt: Date;
  attemptsRemaining: number;
};
