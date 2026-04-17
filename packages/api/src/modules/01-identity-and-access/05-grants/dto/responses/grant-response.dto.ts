import { GrantSummaryResponseDto } from './grant-summary-response.dto';

export class GrantResponseDto extends GrantSummaryResponseDto {
  creationReason!: string | null;
  revocationReason!: string | null;
  createdBy!: string | null;
  revokedBy!: string | null;
  activatedAt!: Date | null;
  expiredAt!: Date | null;
  revokedAt!: Date | null;
  version!: number;
}
