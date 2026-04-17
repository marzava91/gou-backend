// packages\api\src\modules\01-identity-and-access\02-auth\dto\commands\confirm-password-reset.dto.ts

import { IsString, MaxLength } from 'class-validator';
import {
  AUTH_CHALLENGE_LIMITS,
  AUTH_INPUT_LIMITS,
} from '../../domain/constants/auth.constants';

export class ConfirmPasswordResetDto {
  @IsString()
  @MaxLength(AUTH_CHALLENGE_LIMITS.CHALLENGE_ID_MAX_LENGTH)
  challengeId!: string;

  @IsString()
  @MaxLength(AUTH_CHALLENGE_LIMITS.CHALLENGE_CODE_MAX_LENGTH)
  code!: string;

  @IsString()
  @MaxLength(AUTH_INPUT_LIMITS.PASSWORD_MAX_LENGTH)
  newPassword!: string;
}
