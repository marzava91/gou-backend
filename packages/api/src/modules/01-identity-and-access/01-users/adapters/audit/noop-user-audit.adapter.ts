// packages\api\src\modules\01_indentity_access\01_users\adapters\audit\noop-user-audit.adapter.ts

import { Injectable } from '@nestjs/common';
import { UserAuditPort } from '../../ports/user-audit.port';

@Injectable()
export class NoopUserAuditAdapter implements UserAuditPort {
  async record(): Promise<void> {
    return;
  }
}
