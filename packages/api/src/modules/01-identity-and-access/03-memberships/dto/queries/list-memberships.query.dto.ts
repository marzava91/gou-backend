// packages/api/src/modules/01-identity-and-access/03-memberships/dto/queries/list-memberships.query.dto.ts

import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsCuid } from '../../validators/is-cuid.validator';
import {
  MembershipScopeType,
  MembershipStatus,
} from '@prisma/client';

import {
  MEMBERSHIP_DEFAULT_PAGE_SIZE,
  MEMBERSHIP_LIST_SORT_DIRECTIONS,
  MEMBERSHIP_LIST_SORT_FIELDS,
  MEMBERSHIP_MAX_PAGE_SIZE,
  type MembershipListSortDirection,
  type MembershipListSortField,
} from '../../domain/constants/membership.constants';

export class ListMembershipsQueryDto {
  @IsOptional()
  @IsCuid()
  userId?: string;

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
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MEMBERSHIP_MAX_PAGE_SIZE)
  pageSize: number = MEMBERSHIP_DEFAULT_PAGE_SIZE;

  @IsOptional()
  @IsEnum(MEMBERSHIP_LIST_SORT_FIELDS)
  sortBy: MembershipListSortField = 'createdAt';

  @IsOptional()
  @IsEnum(MEMBERSHIP_LIST_SORT_DIRECTIONS)
  sortDirection: MembershipListSortDirection = 'desc';
}