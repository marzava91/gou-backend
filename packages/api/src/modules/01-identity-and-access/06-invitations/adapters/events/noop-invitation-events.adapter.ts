import { Injectable } from '@nestjs/common';
import type { InvitationEventsPort } from '../../ports/invitation-events.port';

@Injectable()
export class NoopInvitationEventsAdapter implements InvitationEventsPort {
  async publish(): Promise<void> {
    return;
  }
}
