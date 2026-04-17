// packages\api\src\modules\01-identity-and-access\02-auth\mappers\auth-response.mapper.ts

import type { AuthProvider, AuthSessionStatus } from '@prisma/client';
import { AuthIdentityResponseDto } from '../dto/responses/auth-identity-response.dto';
import { AuthSessionResponseDto } from '../dto/responses/auth-session-response.dto';
import { CurrentAuthContextResponseDto } from '../dto/responses/current-auth-context-response.dto';

type SessionResponseInput = {
  sessionId: string;
  userId: string;
  provider: AuthProvider;
  status: AuthSessionStatus;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: Date;
  refreshExpiresAt?: Date | null;
};

type IdentityResponseInput = {
  id: string;
  userId: string;
  provider: AuthProvider;
  providerSubject: string;
  email?: string | null;
  phone?: string | null;
  createdAt: Date;
};

type CurrentContextResponseInput = {
  userId: string;
  sessionId: string;
  sessionStatus: AuthSessionStatus;
  identities: AuthIdentityResponseDto[];
};

export class AuthResponseMapper {
  static toSessionResponse(
    input: SessionResponseInput,
  ): AuthSessionResponseDto {
    return {
      sessionId: input.sessionId,
      userId: input.userId,
      provider: input.provider,
      status: input.status,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken ?? null,
      expiresAt: input.expiresAt,
      refreshExpiresAt: input.refreshExpiresAt ?? null,
    };
  }

  static toIdentityResponse(
    identity: IdentityResponseInput,
  ): AuthIdentityResponseDto {
    return {
      id: identity.id,
      userId: identity.userId,
      provider: identity.provider,
      providerSubject: identity.providerSubject,
      email: identity.email ?? null,
      phone: identity.phone ?? null,
      createdAt: identity.createdAt,
    };
  }

  static toCurrentContextResponse(
    input: CurrentContextResponseInput,
  ): CurrentAuthContextResponseDto {
    return {
      userId: input.userId,
      sessionId: input.sessionId,
      sessionStatus: input.sessionStatus,
      identities: input.identities,
    };
  }
}
