import { Injectable } from '@nestjs/common';
import { RoleEventsPort } from '../../ports/role-events.port';

@Injectable()
export class NoopRoleEventsAdapter implements RoleEventsPort {
  async publish(): Promise<void> {
    return;
  }
}