// packages\api\src\modules\01-identity-and-access\02-auth\dto\commands\link-identity.dto.ts

/**
 * TODO(auth-provider-integration):
 * Once real provider adapters are implemented, federated providers such as
 * GOOGLE and APPLE should prefer verified external tokens over free-form
 * providerSubject input. providerSubject should remain only for controlled
 * internal/testing flows unless business rules define otherwise.
 */

import { AuthProvider } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AUTH_INPUT_LIMITS, AUTH_PROVIDER_LIMITS } from '../../domain/constants/auth.constants';
import { ExactlyOneOf } from '../../validators/exactly-one-of.validator';

export class LinkIdentityDto {
  @IsEnum(AuthProvider)
  provider!: AuthProvider;

  @IsOptional()
  @IsString()
  @MaxLength(AUTH_INPUT_LIMITS.EXTERNAL_TOKEN_MAX_LENGTH)
  @ExactlyOneOf<LinkIdentityDto>(['externalToken', 'providerSubject'], {
    message:
      'Exactly one of externalToken or providerSubject must be provided.',
  })
  externalToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(AUTH_PROVIDER_LIMITS.PROVIDER_SUBJECT_MAX_LENGTH)
  providerSubject?: string;
}