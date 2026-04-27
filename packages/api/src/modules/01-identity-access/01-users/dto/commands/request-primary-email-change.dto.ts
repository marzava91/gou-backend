// packages\api\src\modules\01-identity-and-access\01-users\dto\commands\request-primary-email-change.dto.ts

import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { USER_FIELD_LIMITS } from '../../domain/constants/users.constants';

export class RequestPrimaryEmailChangeDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'invalid_email_format' })
  @IsNotEmpty({ message: 'new_primary_email_required' })
  @MaxLength(USER_FIELD_LIMITS.EMAIL_MAX_LENGTH)
  newPrimaryEmail!: string;
}
