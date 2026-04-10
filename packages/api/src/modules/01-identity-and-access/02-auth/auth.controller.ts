// packages\api\src\modules\01-identity-and-access\02-auth\auth.controller.ts

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/commands/login.dto';
import { RefreshSessionDto } from './dto/commands/refresh-session.dto';
import { LogoutDto } from './dto/commands/logout.dto';
import { LogoutAllSessionsDto } from './dto/commands/logout-all-sessions.dto';
import { RequestVerificationCodeDto } from './dto/commands/request-verification-code.dto';
import { VerifyCodeDto } from './dto/commands/verify-code.dto';
import { RequestPasswordResetDto } from './dto/commands/request-password-reset.dto';
import { ConfirmPasswordResetDto } from './dto/commands/confirm-password-reset.dto';
import { LinkIdentityDto } from './dto/commands/link-identity.dto';
import { UnlinkIdentityDto } from './dto/commands/unlink-identity.dto';

import { CurrentAuthActor } from './decorators/current-auth-actor.decorator';
import { AuthAuthenticatedGuard } from './guards/auth-authenticated.guard';

import type { AuthenticatedAuthActor } from './domain/types/auth.types';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  refreshSession(@Body() dto: RefreshSessionDto) {
    return this.authService.refreshSession(dto);
  }

  @Post('logout')
  @UseGuards(AuthAuthenticatedGuard)
  @HttpCode(200)
  logout(
    @CurrentAuthActor() actor: AuthenticatedAuthActor,
    @Body() dto: LogoutDto,
  ) {
    return this.authService.logout(actor.userId, dto);
  }

  @Post('logout-all')
  @UseGuards(AuthAuthenticatedGuard)
  @HttpCode(200)
  logoutAllSessions(
    @CurrentAuthActor() actor: AuthenticatedAuthActor,
  ) {
    return this.authService.logoutAllSessions(actor.userId);
  }

  @Post('verification/request')
  @HttpCode(200)
  requestVerificationCode(@Body() dto: RequestVerificationCodeDto) {
    return this.authService.requestVerificationCode(null, dto);
  }

  @Post('verification/verify')
  @HttpCode(200)
  verifyCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto);
  }

  @Post('password-reset/request')
  @HttpCode(200)
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/confirm')
  @HttpCode(200)
  confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    return this.authService.confirmPasswordReset(dto);
  }

  @Get('me')
  @UseGuards(AuthAuthenticatedGuard)
  getCurrentAuthContext(
    @CurrentAuthActor() actor: AuthenticatedAuthActor,
  ) {
    return this.authService.getCurrentAuthContext(actor);
  }

  @Post('identities/link')
  @UseGuards(AuthAuthenticatedGuard)
  @HttpCode(200)
  linkIdentity(
    @CurrentAuthActor() actor: AuthenticatedAuthActor,
    @Body() dto: LinkIdentityDto,
  ) {
    return this.authService.linkIdentity(actor.userId, dto);
  }

  @Post('identities/unlink')
  @UseGuards(AuthAuthenticatedGuard)
  @HttpCode(200)
  unlinkIdentity(
    @CurrentAuthActor() actor: AuthenticatedAuthActor,
    @Body() dto: UnlinkIdentityDto,
  ) {
    return this.authService.unlinkIdentity(actor.userId, dto);
  }
}