import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { InvitationRecipientType, MembershipScopeType } from '@prisma/client';
import { INVITATION_FIELD_LIMITS } from '../../domain/constants/invitation.constants';

export class CreateInvitationDto {
  @IsEnum(InvitationRecipientType)
  recipientType!: InvitationRecipientType;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(INVITATION_FIELD_LIMITS.RECIPIENT_MAX_LENGTH)
  recipientValue!: string;

  @IsEnum(MembershipScopeType)
  scopeType!: MembershipScopeType;

  @IsString()
  @MaxLength(191)
  tenantId!: string;

  @ValidateIf((o) => o.scopeType === MembershipScopeType.STORE)
  @IsString()
  @MaxLength(191)
  storeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(INVITATION_FIELD_LIMITS.ROLE_KEY_MAX_LENGTH)
  proposedRoleKey?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
