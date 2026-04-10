// packages\api\src\modules\01-identity-and-access\02-auth\adapters\providers\noop-auth-provider.adapter.ts

import { Injectable } from '@nestjs/common';
import { AuthPasswordResetFailedError, InvalidCredentialsError } from '../../domain/errors/auth.errors';
import { AuthProviderPort } from '../../ports/auth-provider.port';

@Injectable()
export class NoopAuthProviderAdapter implements AuthProviderPort {
    /**
   * TODO(auth-provider-adapter):
   * Replace this noop adapter with real provider integrations for the MVP auth
   * surfaces, including password-based auth where applicable, external token
   * verification for federated providers (e.g. GOOGLE / APPLE), and provider-side
   * password reset support if that flow remains part of Auth.
   */
  async authenticate(): Promise<never> {
    throw new InvalidCredentialsError();
  }

  async resetPassword(): Promise<never> {
    throw new AuthPasswordResetFailedError();
  }
}