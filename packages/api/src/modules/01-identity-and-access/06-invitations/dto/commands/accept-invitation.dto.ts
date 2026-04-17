import { Transform } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';
import { INVITATION_FIELD_LIMITS } from '../../domain/constants/invitation.constants';

export class AcceptInvitationDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(INVITATION_FIELD_LIMITS.RECIPIENT_MAX_LENGTH)
  recipientValue!: string;
}
