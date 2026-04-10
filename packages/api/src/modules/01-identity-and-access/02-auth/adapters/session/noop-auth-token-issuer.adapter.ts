// packages\api\src\modules\01-identity-and-access\02-auth\adapters\session\noop-auth-token-issuer.adapter.ts

import { Injectable } from '@nestjs/common';
import { AuthTokenIssuerPort } from '../../ports/auth-token-issuer.port';

@Injectable()
export class NoopAuthTokenIssuerAdapter implements AuthTokenIssuerPort {
    /**
   * TODO(auth-token-issuer):
   * Replace this noop adapter with a real token issuance implementation aligned
   * with the platform session strategy, including signed access tokens, refresh
   * credentials, expiration policy and rotation/renewal rules where applicable.
   */
  async issueAccessToken(): Promise<{ token: string; expiresAt: Date }> {
    return {
      token: 'noop-access-token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  }

  async issueRefreshToken(): Promise<{ token: string; expiresAt: Date }> {
    return {
      token: 'noop-refresh-token',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }
}