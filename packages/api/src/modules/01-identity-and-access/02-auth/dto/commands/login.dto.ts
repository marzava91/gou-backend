// packages/api/src/modules/01-identity-and-access/02-auth/dto/commands/login.dto.ts

import { AuthProvider } from '@prisma/client';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { 
  AUTH_INPUT_LIMITS, 
  LOGIN_ALLOWED_PROVIDERS 
} from '../../domain/constants/auth.constants';



export class LoginDto {
  /**
   * REQUIRED
   * Defines the domain auth provider exposed by the Auth API.
   *
   * FIREBASE is an infrastructure broker and must not be accepted as a public
   * provider value in normal domain login requests.
   */
  @IsIn(LOGIN_ALLOWED_PROVIDERS)
  provider!: (typeof LOGIN_ALLOWED_PROVIDERS)[number];

  /**
   * OPTIONAL
   * Used mainly for PASSWORD flows or legacy compatibility
   */
  @IsOptional()
  @IsString()
  @MaxLength(AUTH_INPUT_LIMITS.LOGIN_IDENTIFIER_MAX_LENGTH)
  identifier?: string;

  /**
   * OPTIONAL
   * Used for PASSWORD flows OR temporary Firebase token fallback
   */
  @IsOptional()
  @IsString()
  @MaxLength(AUTH_INPUT_LIMITS.PASSWORD_MAX_LENGTH)
  secret?: string;

  /**
   * OPTIONAL (BUT PRACTICALLY REQUIRED FOR GOOGLE / APPLE / PHONE)
   * Firebase ID token or external provider token
   */
  @IsOptional()
  @IsString()
  @MaxLength(AUTH_INPUT_LIMITS.EXTERNAL_TOKEN_MAX_LENGTH)
  externalToken?: string;

  /**
   * OPTIONAL
   */
  @IsOptional()
  @IsString()
  @MaxLength(AUTH_INPUT_LIMITS.DEVICE_NAME_MAX_LENGTH)
  deviceName?: string;
}