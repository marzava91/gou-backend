import { Injectable } from '@nestjs/common';
import type { InvitationNotificationPort } from '../../ports/invitation-notification.port';

@Injectable()
export class NoopInvitationNotificationAdapter implements InvitationNotificationPort {
  async sendInvitation(): Promise<void> {
    return;
  }
}
