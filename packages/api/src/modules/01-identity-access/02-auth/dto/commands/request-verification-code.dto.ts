// packages\api\src\modules\01-identity-and-access\02-auth\dto\commands\request-verification-code.dto.ts

import { AuthVerificationChallengePurpose } from '@prisma/client';
import { IsEnum, IsString, MaxLength } from 'class-validator';
import { AUTH_INPUT_LIMITS } from '../../domain/constants/auth.constants';

export class RequestVerificationCodeDto {
  @IsString()
  @MaxLength(AUTH_INPUT_LIMITS.LOGIN_IDENTIFIER_MAX_LENGTH)
  target!: string;

  @IsEnum(AuthVerificationChallengePurpose)
  purpose!: AuthVerificationChallengePurpose;
}
