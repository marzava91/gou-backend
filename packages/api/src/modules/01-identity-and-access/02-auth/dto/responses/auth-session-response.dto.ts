// packages\api\src\modules\01-identity-and-access\02-auth\dto\responses\auth-session-response.dto.ts

import { AuthProvider, AuthSessionStatus } from '@prisma/client';

export class AuthSessionResponseDto {
  sessionId!: string;
  userId!: string;
  provider!: AuthProvider;
  status!: AuthSessionStatus;
  accessToken!: string;
  refreshToken?: string | null;
  expiresAt!: Date;
  refreshExpiresAt?: Date | null;
}