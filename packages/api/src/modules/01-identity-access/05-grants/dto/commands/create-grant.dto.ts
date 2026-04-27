import { GrantEffect, GrantTargetType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateGrantDto {
  @IsString()
  @MaxLength(191)
  membershipId!: string;

  @IsEnum(GrantEffect)
  effect!: GrantEffect;

  @IsEnum(GrantTargetType)
  targetType!: GrantTargetType;

  @ValidateIf((o) => o.targetType === GrantTargetType.CAPABILITY)
  @IsString()
  @MaxLength(191)
  capabilityKey?: string;

  @ValidateIf((o) => o.targetType === GrantTargetType.RESOURCE_ACTION)
  @IsString()
  @MaxLength(191)
  resourceKey?: string;

  @ValidateIf((o) => o.targetType === GrantTargetType.RESOURCE_ACTION)
  @IsString()
  @MaxLength(191)
  actionKey?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
