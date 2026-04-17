import { GrantEffect, GrantStatus, GrantTargetType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListGrantsQueryDto {
  @IsOptional()
  @IsString()
  membershipId?: string;

  @IsOptional()
  @IsEnum(GrantEffect)
  effect?: GrantEffect;

  @IsOptional()
  @IsEnum(GrantTargetType)
  targetType?: GrantTargetType;

  @IsOptional()
  @IsEnum(GrantStatus)
  status?: GrantStatus;
}
