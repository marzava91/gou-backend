// packages\api\src\modules\01-identity-and-access\02-auth\dto\commands\request-password-reset.dto.ts

import { IsString, MaxLength } from 'class-validator';
import { AUTH_INPUT_LIMITS } from '../../domain/constants/auth.constants';

export class RequestPasswordResetDto {
  @IsString()
  @MaxLength(AUTH_INPUT_LIMITS.LOGIN_IDENTIFIER_MAX_LENGTH)
  identifier!: string;
}