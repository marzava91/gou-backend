import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  InvitationRecipientType,
  InvitationStatus,
  MembershipScopeType,
} from '@prisma/client';
import {
  INVITATION_LIST_SORT_FIELDS,
  INVITATION_OPERATIONAL_LIMITS,
  INVITATION_SORT_DIRECTIONS,
  type InvitationListSortField,
  type InvitationSortDirection,
} from '../../domain/constants/invitation.constants';

export class ListInvitationsQueryDto {
  @IsOptional()
  @IsEnum(InvitationStatus)
  status?: InvitationStatus;

  @IsOptional()
  @IsEnum(InvitationRecipientType)
  recipientType?: InvitationRecipientType;

  @IsOptional()
  @IsEnum(MembershipScopeType)
  scopeType?: MembershipScopeType;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  tenantId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  storeId?: string;

  @IsOptional()
  @IsIn(Object.values(INVITATION_LIST_SORT_FIELDS))
  sortBy?: InvitationListSortField;

  @IsOptional()
  @IsIn(Object.values(INVITATION_SORT_DIRECTIONS))
  sortDirection?: InvitationSortDirection;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
