// packages\api\src\modules\01-identity-and-access\01-users\dto\commands\update-user-profile.dto.ts

import { Transform } from 'class-transformer';
import { USER_FIELD_LIMITS } from '../../domain/constants/users.constants';
import { IsOptional, IsString, MaxLength, IsUrl } from 'class-validator';

export class UpdateUserProfileDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(USER_FIELD_LIMITS.FIRST_NAME_MAX_LENGTH)
  firstName?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(USER_FIELD_LIMITS.LAST_NAME_MAX_LENGTH)
  lastName?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(USER_FIELD_LIMITS.DISPLAY_NAME_MAX_LENGTH)
  displayName?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsUrl({ require_tld: false }, { message: 'invalid_avatar_url' })
  @MaxLength(USER_FIELD_LIMITS.AVATAR_URL_MAX_LENGTH)
  avatarUrl?: string;
}
