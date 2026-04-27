// adapters/events/noop-access-resolution-events.adapter.ts
import { Injectable } from '@nestjs/common';
import { AccessResolutionEventsPort } from '../../ports/access-resolution-events.port';

@Injectable()
export class NoopAccessResolutionEventsAdapter implements AccessResolutionEventsPort {
  async publish(): Promise<void> {
    return;
  }
}