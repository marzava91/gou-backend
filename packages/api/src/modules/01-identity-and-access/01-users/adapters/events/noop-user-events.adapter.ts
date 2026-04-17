// packages\api\src\modules\01_indentity_access\01_users\adapters\events\noop-user-events.adapter.ts

import { Injectable } from '@nestjs/common';
import { UserEventsPort } from '../../ports/user-events.port';

@Injectable()
export class NoopUserEventsAdapter implements UserEventsPort {
  async publish(): Promise<void> {
    return;
  }
}
