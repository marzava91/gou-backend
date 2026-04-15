// packages/api/src/modules/01-identity-and-access/03-memberships/dto/commands/set-active-membership-context.dto.ts

import { IsEnum } from 'class-validator';
import { IsCuid } from '../../validators/is-cuid.validator';
import { OperationalSurface } from '@prisma/client';

export class SetActiveMembershipContextDto {
  @IsCuid()
  membershipId!: string;

  @IsEnum(OperationalSurface)
  surface!: OperationalSurface;
}