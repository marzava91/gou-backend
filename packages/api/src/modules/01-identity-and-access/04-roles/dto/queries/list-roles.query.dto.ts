import { IsEnum, IsOptional } from 'class-validator';
import { RoleScopeType } from '@prisma/client';

export class ListRolesQueryDto {
  @IsOptional()
  @IsEnum(RoleScopeType)
  scopeType?: RoleScopeType;
}