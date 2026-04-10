// packages\api\src\modules\01-identity-and-access\02-auth\adapters\events\noop-auth-events.adapter.ts

import { Injectable } from '@nestjs/common';
import { AuthEventsPort } from '../../ports/auth-events.port';

@Injectable()
export class NoopAuthEventsAdapter implements AuthEventsPort {
    /**
   * TODO(auth-events-adapter):
   * Replace this noop adapter with a real domain event publisher that supports
   * durable publication, retry policy, observability and downstream consumers
   * before production hardening.
   */
  async publish(): Promise<void> {}
}