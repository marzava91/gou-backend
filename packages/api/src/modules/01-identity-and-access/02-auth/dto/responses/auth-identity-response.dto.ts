// packages\api\src\modules\01-identity-and-access\02-auth\dto\responses\auth-identity-response.dto.ts

import { AuthProvider } from '@prisma/client';

export class AuthIdentityResponseDto {
  id!: string;
  userId!: string;
  provider!: AuthProvider;
  providerSubject!: string;
  email?: string | null;
  phone?: string | null;
  createdAt!: Date;
}
