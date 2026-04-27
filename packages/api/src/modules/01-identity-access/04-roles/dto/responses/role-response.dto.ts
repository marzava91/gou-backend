import { RoleScopeType } from '@prisma/client';

export class RoleResponseDto {
  id!: string;
  key!: string;
  name!: string;
  description!: string | null;
  scopeType!: RoleScopeType;
  isSystem!: boolean;
  retiredAt!: Date | null;
  version!: number;
  capabilityKeys!: string[];
  createdAt!: Date;
  updatedAt!: Date;
}
