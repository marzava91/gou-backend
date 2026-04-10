// packages\api\src\modules\01-identity-and-access\02-auth\dto\commands\unlink-identity.dto.ts

import { AuthProvider } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UnlinkIdentityDto {
  @IsEnum(AuthProvider)
  provider!: AuthProvider;
}