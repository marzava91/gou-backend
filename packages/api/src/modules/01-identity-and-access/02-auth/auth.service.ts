// packages\api\src\modules\01-identity-and-access\02-auth\auth.service.ts

import { Injectable } from '@nestjs/common';

import type { AuthenticatedAuthActor } from './domain/types/auth.types';

import { LoginDto } from './dto/commands/login.dto';
import { RefreshSessionDto } from './dto/commands/refresh-session.dto';
import { LogoutDto } from './dto/commands/logout.dto';
import { RequestVerificationCodeDto } from './dto/commands/request-verification-code.dto';
import { VerifyCodeDto } from './dto/commands/verify-code.dto';
import { RequestPasswordResetDto } from './dto/commands/request-password-reset.dto';
import { ConfirmPasswordResetDto } from './dto/commands/confirm-password-reset.dto';
import { LinkIdentityDto } from './dto/commands/link-identity.dto';
import { UnlinkIdentityDto } from './dto/commands/unlink-identity.dto';

import { AuthLoginService } from './application/auth-login.service';
import { AuthSessionService } from './application/auth-session.service';
import { AuthVerificationService } from './application/auth-verification.service';
import { AuthPasswordResetService } from './application/auth-password-reset.service';
import { AuthIdentityService } from './application/auth-identity.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly authLoginService: AuthLoginService,
    private readonly authSessionService: AuthSessionService,
    private readonly authVerificationService: AuthVerificationService,
    private readonly authPasswordResetService: AuthPasswordResetService,
    private readonly authIdentityService: AuthIdentityService,
  ) {}

  login(dto: LoginDto) {
    return this.authLoginService.login(dto);
  }

  refreshSession(dto: RefreshSessionDto) {
    return this.authSessionService.refreshSession(dto);
  }

  logout(actorUserId: string, dto: LogoutDto) {
    return this.authSessionService.logout(actorUserId, dto);
  }

  logoutAllSessions(actorUserId: string) {
    return this.authSessionService.logoutAllSessions(actorUserId);
  }

  requestVerificationCode(actorUserId: string | null, dto: RequestVerificationCodeDto) {
    return this.authVerificationService.requestVerificationCode(actorUserId, dto);
  }

  verifyCode(dto: VerifyCodeDto) {
    return this.authVerificationService.verifyCode(dto);
  }

  requestPasswordReset(dto: RequestPasswordResetDto) {
    return this.authPasswordResetService.requestPasswordReset(dto);
  }

  confirmPasswordReset(dto: ConfirmPasswordResetDto) {
    return this.authPasswordResetService.confirmPasswordReset(dto);
  }

  getCurrentAuthContext(actor: AuthenticatedAuthActor) {
    return this.authSessionService.getCurrentAuthContext(actor);
  }

  linkIdentity(actorUserId: string, dto: LinkIdentityDto) {
    return this.authIdentityService.linkIdentity(actorUserId, dto);
  }

  unlinkIdentity(actorUserId: string, dto: UnlinkIdentityDto) {
    return this.authIdentityService.unlinkIdentity(actorUserId, dto);
  }
}