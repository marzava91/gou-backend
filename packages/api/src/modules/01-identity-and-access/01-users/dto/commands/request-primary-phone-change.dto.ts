// packages/api/src/modules/01-identity-and-access/01-users/dto/commands/request-primary-phone-change.dto.ts

import { Transform } from 'class-transformer';
import { IsNotEmpty, Matches, MaxLength } from 'class-validator';
import {
  USER_FIELD_LIMITS,
  USER_REGEX,
} from '../../domain/constants/users.constants';

export class RequestPrimaryPhoneChangeDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'new_primary_phone_required' })
  @Matches(USER_REGEX.E164_PHONE, {
    message: 'invalid_phone_format',
  })
  @MaxLength(USER_FIELD_LIMITS.PHONE_MAX_LENGTH)
  newPrimaryPhone!: string;
}
