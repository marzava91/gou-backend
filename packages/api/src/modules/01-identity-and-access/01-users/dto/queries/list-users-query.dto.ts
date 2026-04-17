// packages\api\src\modules\01-identity-and-access\01-users\dto\queries\list-users-query.dto.ts

import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { UserStatus } from '@prisma/client';
import {
  USER_FIELD_LIMITS,
  USER_LIMITS,
  USER_LIST_SORT_FIELDS,
  USER_SORT_DIRECTIONS,
} from '../../domain/constants/users.constants';
import type {
  UserListSortField,
  UserSortDirection,
} from '../../domain/constants/users.constants';

export class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(USER_FIELD_LIMITS.SEARCH_QUERY_MAX_LENGTH)
  q?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  emailVerified?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  phoneVerified?: boolean;

  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @IsOptional()
  @IsEnum(USER_LIST_SORT_FIELDS)
  sortBy: UserListSortField = USER_LIST_SORT_FIELDS.CREATED_AT;

  @IsOptional()
  @IsEnum(USER_SORT_DIRECTIONS)
  sortDir: UserSortDirection = USER_SORT_DIRECTIONS.DESC;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(USER_LIMITS.MAX_PAGE_SIZE)
  limit = USER_LIMITS.DEFAULT_PAGE_SIZE;
}
