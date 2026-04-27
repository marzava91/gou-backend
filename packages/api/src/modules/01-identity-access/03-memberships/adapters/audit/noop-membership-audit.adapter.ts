// packages/api/src/modules/01-identity-and-access/03-memberships/adapters/audit/noop-membership-audit.adapter.ts

import { Injectable } from '@nestjs/common';
import { MembershipAuditPort } from '../../ports/membership-audit.port';

@Injectable()
export class NoopMembershipAuditAdapter implements MembershipAuditPort {
  async record(): Promise<void> {
    // noop
  }
}
