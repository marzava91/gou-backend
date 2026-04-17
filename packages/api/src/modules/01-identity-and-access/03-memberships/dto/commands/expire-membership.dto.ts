// packages/api/src/modules/01-identity-and-access/03-memberships/dto/commands/expire-membership.dto.ts

import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

import { MEMBERSHIP_REASON_MAX_LENGTH } from '../../domain/constants/membership.constants';

export class ExpireMembershipDto {
  @IsOptional()
  @IsDateString()
  expiredAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MEMBERSHIP_REASON_MAX_LENGTH)
  reason?: string;
}
