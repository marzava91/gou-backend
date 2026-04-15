// packages/api/src/modules/01-identity-and-access/03-memberships/dto/commands/revoke-membership.dto.ts

import { IsString, MaxLength } from 'class-validator';

import { MEMBERSHIP_REASON_MAX_LENGTH } from '../../domain/constants/membership.constants';

export class RevokeMembershipDto {
  @IsString()
  @MaxLength(MEMBERSHIP_REASON_MAX_LENGTH)
  reason!: string;
}