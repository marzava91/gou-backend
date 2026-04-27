import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';


import { TooManyRequestsException } from '../../helpers/too-many-requests.exception';

// AUTH / LOGIN

export class InvalidCredentialsError extends UnauthorizedException {
  constructor() {
    super({
      code: 'invalid_credentials',
      message: 'invalid_credentials',
      statusCode: 401,
    });
  }
}

export class UserNotAuthenticableError extends UnauthorizedException {
  constructor() {
    super({
      code: 'user_not_authenticable',
      message: 'user_not_authenticable',
      statusCode: 401,
    });
  }
}

// VERIFICATION

export class AuthVerificationRequiredError extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'auth_verification_required',
      message: 'auth_verification_required',
      statusCode: 422,
    });
  }
}

export class AuthVerificationFailedError extends UnauthorizedException {
  constructor() {
    super({
      code: 'auth_verification_failed',
      message: 'auth_verification_failed',
      statusCode: 401,
    });
  }
}

export class TooManyAttemptsError extends TooManyRequestsException {
  constructor() {
    super({
      code: 'too_many_attempts',
      message: 'too_many_attempts',
      statusCode: 429,
    });
  }
}

export class ChallengeExpiredError extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'challenge_expired',
      message: 'challenge_expired',
      statusCode: 422,
    });
  }
}

export class ChallengeAlreadyConsumedError extends ConflictException {
  constructor() {
    super({
      code: 'challenge_already_consumed',
      message: 'challenge_already_consumed',
      statusCode: 409,
    });
  }
}

// SESSION / REFRESH

export class AuthSessionExpiredError extends UnauthorizedException {
  constructor() {
    super({
      code: 'auth_session_expired',
      message: 'auth_session_expired',
      statusCode: 401,
    });
  }
}

export class AuthSessionRevokedError extends UnauthorizedException {
  constructor() {
    super({
      code: 'auth_session_revoked',
      message: 'auth_session_revoked',
      statusCode: 401,
    });
  }
}

export class AuthRefreshDeniedError extends ForbiddenException {
  constructor() {
    super({
      code: 'auth_refresh_denied',
      message: 'auth_refresh_denied',
      statusCode: 403,
    });
  }
}

// PROVIDER LINKING

export class AuthProviderNotLinkedError extends ConflictException {
  constructor() {
    super({
      code: 'auth_provider_not_linked',
      message: 'auth_provider_not_linked',
      statusCode: 409,
    });
  }
}

export class AuthProviderAlreadyLinkedError extends ConflictException {
  constructor() {
    super({
      code: 'auth_provider_already_linked',
      message: 'auth_provider_already_linked',
      statusCode: 409,
    });
  }
}

export class AuthProviderUnlinkDeniedError extends ConflictException {
  constructor() {
    super({
      code: 'auth_provider_unlink_denied',
      message: 'auth_provider_unlink_denied',
      statusCode: 409,
    });
  }
}

// PASSWORD RESET

export class AuthPasswordResetFailedError extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'auth_password_reset_failed',
      message: 'auth_password_reset_failed',
      statusCode: 422,
    });
  }
}

// AUTHORIZATION / SCOPE

export class ForbiddenAuthScopeError extends ForbiddenException {
  constructor() {
    super({
      code: 'forbidden_auth_scope',
      message: 'forbidden_auth_scope',
      statusCode: 403,
    });
  }
}