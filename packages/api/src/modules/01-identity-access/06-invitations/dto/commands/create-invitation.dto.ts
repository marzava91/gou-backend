import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmpty,
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

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(191)
  tenantId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((o) => o.scopeType === MembershipScopeType.STORE)
  @IsString()
  @MaxLength(191)
  @ValidateIf((o) => o.scopeType === MembershipScopeType.TENANT)
  @IsEmpty({ message: 'invalid_invitation_scope' })
  storeId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(INVITATION_FIELD_LIMITS.ROLE_KEY_MAX_LENGTH)
  proposedRoleKey?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}