import { GrantEffect, GrantStatus, GrantTargetType } from '@prisma/client';

export class GrantSummaryResponseDto {
  id!: string;
  membershipId!: string;
  effect!: GrantEffect;
  targetType!: GrantTargetType;
  capabilityKey!: string | null;
  resourceKey!: string | null;
  actionKey!: string | null;
  status!: GrantStatus;
  validFrom!: Date | null;
  validUntil!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}