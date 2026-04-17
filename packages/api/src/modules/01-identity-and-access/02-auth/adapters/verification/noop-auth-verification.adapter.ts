// packages\api\src\modules\01-identity-and-access\02-auth\adapters\verification\noop-auth-verification.adapter.ts

import { Injectable } from '@nestjs/common';
import { AuthVerificationPort } from '../../ports/auth-verification.port';

@Injectable()
export class NoopAuthVerificationAdapter implements AuthVerificationPort {
  /**
   * TODO(auth-verification-adapter):
   * Replace this noop adapter with a real verification delivery implementation
   * for email/SMS codes, including provider integration, delivery observability,
   * retry policy, and anti-abuse controls before production hardening.
   */
  async sendCode(): Promise<void> {}
}
