// packages/api/src/modules/01-identity-and-access/03-memberships/dto/commands/suspend-membership.dto.ts

import { IsString, MaxLength } from 'class-validator';

import { MEMBERSHIP_REASON_MAX_LENGTH } from '../../domain/constants/membership.constants';

export class SuspendMembershipDto {
  @IsString()
  @MaxLength(MEMBERSHIP_REASON_MAX_LENGTH)
  reason!: string;
}
