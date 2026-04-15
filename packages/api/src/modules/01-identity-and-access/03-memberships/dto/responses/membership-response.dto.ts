// packages/api/src/modules/01-identity-and-access/03-memberships/dto/responses/membership-response.dto.ts

import { MembershipSummaryDto } from './membership-summary.dto';

export class MembershipResponseDto extends MembershipSummaryDto {
  invitationId!: string | null;

  activatedAt!: Date | null;
  suspendedAt!: Date | null;
  revokedAt!: Date | null;
  expiredAt!: Date | null;

  reason!: string | null;

  version!: number;
}