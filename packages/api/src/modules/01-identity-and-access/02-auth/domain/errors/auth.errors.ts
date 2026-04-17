// packages\api\src\modules\01-identity-and-access\02-auth\domain\errors\auth.errors.ts

export abstract class AuthDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidCredentialsError extends AuthDomainError {
  constructor() {
    super('invalid_credentials');
  }
}

export class AuthVerificationRequiredError extends Error {
  constructor() {
    super('auth_verification_required');
  }
}

export class AuthVerificationFailedError extends Error {
  constructor() {
    super('auth_verification_failed');
  }
}

export class AuthSessionExpiredError extends Error {
  constructor() {
    super('auth_session_expired');
  }
}

export class AuthSessionRevokedError extends Error {
  constructor() {
    super('auth_session_revoked');
  }
}

export class AuthRefreshDeniedError extends Error {
  constructor() {
    super('auth_refresh_denied');
  }
}

export class AuthProviderNotLinkedError extends Error {
  constructor() {
    super('auth_provider_not_linked');
  }
}

export class AuthProviderAlreadyLinkedError extends Error {
  constructor() {
    super('auth_provider_already_linked');
  }
}

export class AuthProviderUnlinkDeniedError extends Error {
  constructor() {
    super('auth_provider_unlink_denied');
  }
}

export class AuthPasswordResetFailedError extends Error {
  constructor() {
    super('auth_password_reset_failed');
  }
}

export class TooManyAttemptsError extends Error {
  constructor() {
    super('too_many_attempts');
  }
}

export class ChallengeExpiredError extends Error {
  constructor() {
    super('challenge_expired');
  }
}

export class ChallengeAlreadyConsumedError extends Error {
  constructor() {
    super('challenge_already_consumed');
  }
}

export class UserNotAuthenticableError extends Error {
  constructor() {
    super('user_not_authenticable');
  }
}

export class ForbiddenAuthScopeError extends Error {
  constructor() {
    super('forbidden_auth_scope');
  }
}
