// packages/api/src/modules/01-identity-and-access/03-memberships/dto/queries/list-current-user-memberships.query.dto.ts

import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MembershipStatus, OperationalSurface } from '@prisma/client';

import {
  MEMBERSHIP_DEFAULT_PAGE_SIZE,
  MEMBERSHIP_MAX_PAGE_SIZE,
} from '../../domain/constants/membership.constants';

export class ListCurrentUserMembershipsQueryDto {
  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;

  @IsOptional()
  @IsEnum(OperationalSurface)
  surface?: OperationalSurface;

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
}
