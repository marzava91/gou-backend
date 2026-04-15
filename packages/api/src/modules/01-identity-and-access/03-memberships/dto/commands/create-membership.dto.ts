// packages/api/src/modules/01-identity-and-access/03-memberships/dto/commands/create-membership.dto.ts

import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { MembershipScopeType } from '@prisma/client';

import { IsCuid } from '../../validators/is-cuid.validator';

import { MEMBERSHIP_REASON_MAX_LENGTH } from '../../domain/constants/membership.constants';

export class CreateMembershipDto {
  @IsCuid()
  userId!: string;

  @IsEnum(MembershipScopeType)
  scopeType!: MembershipScopeType;

  @IsString()
  @MaxLength(191)
  tenantId!: string;

  @ValidateIf((o: CreateMembershipDto) => o.scopeType === MembershipScopeType.STORE)
  @IsString()
  @MaxLength(191)
  storeId?: string;

  @IsOptional()
  @IsCuid()
  invitationId?: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MEMBERSHIP_REASON_MAX_LENGTH)
  reason?: string;
}