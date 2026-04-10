// packages\api\src\modules\01-identity-and-access\02-auth\dto\commands\logout.dto.ts

import { IsOptional, IsString, MaxLength } from 'class-validator';
import { AUTH_IDENTIFIER_LIMITS } from '../../domain/constants/auth.constants';

export class LogoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(AUTH_IDENTIFIER_LIMITS.ID_MAX_LENGTH)
  sessionId?: string;
}