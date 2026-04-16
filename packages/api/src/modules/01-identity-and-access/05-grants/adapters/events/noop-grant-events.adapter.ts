import { Injectable } from '@nestjs/common';
import { GrantEventsPort } from '../../ports/grant-events.port';

@Injectable()
export class NoopGrantEventsAdapter implements GrantEventsPort {
  async publish(): Promise<void> {
    // noop
  }
}