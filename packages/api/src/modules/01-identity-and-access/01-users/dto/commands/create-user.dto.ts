// packages/api/src/modules/01-identity-and-access/01-users/dto/commands/create-user.dto.ts

import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  USER_FIELD_LIMITS,
  USER_REGEX,
} from '../../domain/constants/users.constants';
import { AtLeastOneOf } from '../../validators/at-least-one-of.validator';

@AtLeastOneOf(['primaryEmail', 'primaryPhone'], {
  message: 'primary_email_or_phone_required',
})
export class CreateUserDto {
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(USER_FIELD_LIMITS.FIRST_NAME_MAX_LENGTH)
  firstName?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(USER_FIELD_LIMITS.LAST_NAME_MAX_LENGTH)
  lastName?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(USER_FIELD_LIMITS.DISPLAY_NAME_MAX_LENGTH)
  displayName?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsUrl(
    { require_tld: false },
    { message: 'invalid_avatar_url' },
  )
  @MaxLength(USER_FIELD_LIMITS.AVATAR_URL_MAX_LENGTH)
  avatarUrl?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'invalid_email_format' })
  @MaxLength(USER_FIELD_LIMITS.EMAIL_MAX_LENGTH)
  primaryEmail?: string;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Matches(USER_REGEX.E164_PHONE, {
    message: 'invalid_phone_format',
  })
  @MaxLength(USER_FIELD_LIMITS.PHONE_MAX_LENGTH)
  primaryPhone?: string;
}