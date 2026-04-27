import { Injectable } from '@nestjs/common';
import type { InvitationAuditPort } from '../../ports/invitation-audit.port';

@Injectable()
export class NoopInvitationAuditAdapter implements InvitationAuditPort {
  async record(): Promise<void> {
    return;
  }
}
