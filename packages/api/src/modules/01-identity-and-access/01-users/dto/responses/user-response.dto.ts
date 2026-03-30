// packages\api\src\modules\01-identity-and-access\01-users\dto\responses\user-response.dto.ts

import { UserStatus } from '@prisma/client';

export class UserResponseDto {
  id!: string;
  firstName!: string | null;
  lastName!: string | null;
  displayName!: string | null;
  avatarUrl!: string | null;

  primaryEmail!: string | null;
  primaryPhone!: string | null;

  emailVerified!: boolean;
  phoneVerified!: boolean;

  status!: UserStatus;

  deactivatedAt!: Date | null;
  anonymizedAt!: Date | null;

  version!: number;

  createdAt!: Date;
  updatedAt!: Date;
}