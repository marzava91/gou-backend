import { RoleScopeType } from '@prisma/client';

export class RoleSummaryResponseDto {
  id!: string;
  key!: string;
  name!: string;
  scopeType!: RoleScopeType;
  isSystem!: boolean;
  retiredAt!: Date | null;
}
