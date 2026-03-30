// packages\api\src\modules\01-identity-and-access\01-users\dto\commands\confirm-primary-email-change.dto.ts

import { USER_TOKEN_LIMITS } from '../../domain/constants/users.constants';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ConfirmPrimaryEmailChangeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(USER_TOKEN_LIMITS.VERIFICATION_TOKEN_MAX_LENGTH)
  verificationToken!: string;
}