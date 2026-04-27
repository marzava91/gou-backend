// packages/api/src/modules/01-identity-and-access/07-access-resolution/dto/queries/evaluate-access.query.dto.ts

import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { OperationalSurface } from '@prisma/client';
import {
  ACCESS_ACTION_KEY_MAX_LENGTH,
  ACCESS_CAPABILITY_KEY_MAX_LENGTH,
  ACCESS_RESOURCE_KEY_MAX_LENGTH,
} from '../../domain/constants/access-resolution.constants';

export class EvaluateAccessQueryDto {
  @IsEnum(OperationalSurface)
  surface!: OperationalSurface;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  membershipId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(ACCESS_CAPABILITY_KEY_MAX_LENGTH)
  capabilityKey?: string;

  @ValidateIf((o) => !o.capabilityKey)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(ACCESS_RESOURCE_KEY_MAX_LENGTH)
  resourceKey?: string;

  @ValidateIf((o) => !o.capabilityKey)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(ACCESS_ACTION_KEY_MAX_LENGTH)
  actionKey?: string;
}