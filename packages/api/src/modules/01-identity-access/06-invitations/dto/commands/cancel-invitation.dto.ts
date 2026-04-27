import { IsOptional, IsString, MaxLength } from 'class-validator';
import { INVITATION_FIELD_LIMITS } from '../../domain/constants/invitation.constants';

export class CancelInvitationDto {
  @IsOptional()
  @IsString()
  @MaxLength(INVITATION_FIELD_LIMITS.ACTION_REASON_MAX_LENGTH)
  reason?: string;
}