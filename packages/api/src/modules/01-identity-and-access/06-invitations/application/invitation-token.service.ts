import { createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import type { InvitationTokenPayload } from '../domain/types/invitation.types';

@Injectable()
export class InvitationTokenService {
  generate(invitationId: string, expiresAt: Date): InvitationTokenPayload {
    const token = randomBytes(32).toString('hex');
    return {
      invitationId,
      token,
      expiresAt,
    };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
