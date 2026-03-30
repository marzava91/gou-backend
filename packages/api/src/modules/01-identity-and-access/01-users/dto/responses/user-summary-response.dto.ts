// packages\api\src\modules\01-identity-and-access\01-users\dto\responses\user-summary-response.dto.ts

import { UserStatus } from '@prisma/client';

export class UserSummaryResponseDto {
  id!: string;
  displayName!: string | null;
  primaryEmail!: string | null;
  primaryPhone!: string | null;
  status!: UserStatus;
  createdAt!: Date;
}