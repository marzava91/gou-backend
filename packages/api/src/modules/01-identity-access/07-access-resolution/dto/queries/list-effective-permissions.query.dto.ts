// packages/api/src/modules/01-identity-and-access/07-access-resolution/dto/queries/list-effective-permissions.query.dto.ts

import { OperationalSurface } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListEffectivePermissionsQueryDto {
  @IsEnum(OperationalSurface)
  surface!: OperationalSurface;

  @IsOptional()
  @IsString()
  membershipId?: string;
}