// packages\api\src\modules\01-identity-and-access\02-auth\dto\responses\current-auth-context-response.dto.ts

import { AuthSessionStatus } from '@prisma/client';
import { AuthIdentityResponseDto } from './auth-identity-response.dto';

export class CurrentAuthContextResponseDto {
  userId!: string;
  sessionId!: string;
  sessionStatus!: AuthSessionStatus;
  identities!: AuthIdentityResponseDto[];
}
