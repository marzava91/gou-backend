// packages/api/src/modules/01-identity-and-access/03-memberships/adapters/events/noop-membership-events.adapter.ts

import { Injectable } from '@nestjs/common';
import { MembershipEventsPort } from '../../ports/membership-events.port';

@Injectable()
export class NoopMembershipEventsAdapter implements MembershipEventsPort {
  async publish(): Promise<void> {
    // noop
  }
}