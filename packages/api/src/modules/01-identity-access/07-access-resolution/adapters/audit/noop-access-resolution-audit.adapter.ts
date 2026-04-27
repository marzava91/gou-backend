// adapters/audit/noop-access-resolution-audit.adapter.ts
import { Injectable } from '@nestjs/common';
import { AccessResolutionAuditPort } from '../../ports/access-resolution-audit.port';

@Injectable()
export class NoopAccessResolutionAuditAdapter implements AccessResolutionAuditPort {
  async record(): Promise<void> {
    return;
  }
}