import { Injectable } from '@nestjs/common';
import { GrantAuditPort } from '../../ports/grant-audit.port';

@Injectable()
export class NoopGrantAuditAdapter implements GrantAuditPort {
  async record(): Promise<void> {
    // noop
  }
}