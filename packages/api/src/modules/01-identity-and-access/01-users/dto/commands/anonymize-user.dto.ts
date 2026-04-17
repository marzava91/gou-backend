// packages\api\src\modules\01-identity-and-access\01-users\dto\commands\anonymize-user.dto.ts

import { USER_FIELD_LIMITS } from '../../domain/constants/users.constants';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AnonymizeUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(USER_FIELD_LIMITS.ACTION_REASON_MAX_LENGTH)
  reason?: string;
}
