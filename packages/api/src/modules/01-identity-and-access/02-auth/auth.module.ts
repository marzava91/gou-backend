// packages\api\src\modules\01-identity-and-access\02-auth\auth.module.ts

import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';

import { AUTH_AUDIT_PORT } from './ports/auth-audit.port';
import { AUTH_EVENTS_PORT } from './ports/auth-events.port';
import { AUTH_PROVIDER_PORT } from './ports/auth-provider.port';
import { AUTH_TOKEN_ISSUER_PORT } from './ports/auth-token-issuer.port';
import { AUTH_VERIFICATION_PORT } from './ports/auth-verification.port';

import { NoopAuthAuditAdapter } from './adapters/audit/noop-auth-audit.adapter';
import { NoopAuthEventsAdapter } from './adapters/events/noop-auth-events.adapter';
import { NoopAuthTokenIssuerAdapter } from './adapters/session/noop-auth-token-issuer.adapter';
import { NoopAuthVerificationAdapter } from './adapters/verification/noop-auth-verification.adapter';

import { FirebaseAuthProviderAdapter } from './adapters/providers/firebase/firebase-auth.provider.adapter';
import { FirebaseAdminProvider } from './adapters/providers/firebase/firebase-admin.provider';

import { AuthSupportService } from './application/support/auth-support.service';
import { AuthLoginService } from './application/auth-login.service';
import { AuthSessionService } from './application/auth-session.service';
import { AuthVerificationService } from './application/auth-verification.service';
import { AuthIdentityService } from './application/auth-identity.service';
import { AuthPasswordResetService } from './application/auth-password-reset.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    AuthSupportService,
    AuthLoginService,
    AuthSessionService,
    AuthVerificationService,
    AuthIdentityService,
    AuthPasswordResetService,
    FirebaseAdminProvider,
    {
      provide: AUTH_PROVIDER_PORT,
      useClass: FirebaseAuthProviderAdapter,
    },
    {
      provide: AUTH_TOKEN_ISSUER_PORT,
      useClass: NoopAuthTokenIssuerAdapter,
    },
    {
      provide: AUTH_AUDIT_PORT,
      useClass: NoopAuthAuditAdapter,
    },
    {
      provide: AUTH_EVENTS_PORT,
      useClass: NoopAuthEventsAdapter,
    },
    {
      provide: AUTH_VERIFICATION_PORT,
      useClass: NoopAuthVerificationAdapter,
    },
  ],
  exports: [AuthService],
})

/**
 * MVP bootstrap wiring:
 * noop adapters are intentionally used while Auth domain flows and contracts
 * are being stabilized. Replace with infrastructure implementations before
 * enabling production authentication surfaces.
 */

export class AuthModule {}