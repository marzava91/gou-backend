// packages/api/src/modules/01-identity-and-access/07-access-resolution/dto/queries/resolve-access-context.query.dto.ts

import { OperationalSurface } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ResolveAccessContextQueryDto {
  @IsEnum(OperationalSurface)
  surface!: OperationalSurface;

  @IsOptional()
  @IsString()
  membershipId?: string;
}