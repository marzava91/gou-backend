// packages\api\src\modules\01-identity-and-access\02-auth\dto\commands\refresh-session.dto.ts

import { IsString, MaxLength } from 'class-validator';
import { AUTH_STORAGE_LIMITS } from '../../domain/constants/auth.constants';

export class RefreshSessionDto {
  @IsString()
  @MaxLength(AUTH_STORAGE_LIMITS.HASH_MAX_LENGTH)
  refreshToken!: string;
}