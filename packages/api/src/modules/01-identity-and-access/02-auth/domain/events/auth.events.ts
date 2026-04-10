// packages\api\src\modules\01-identity-and-access\02-auth\domain\events\auth.events.ts

export const AuthDomainEvents = {
  LOGIN_SUCCEEDED: 'auth_login_succeeded',
  LOGIN_FAILED: 'auth_login_failed',
  SESSION_ISSUED: 'auth_session_issued',
  SESSION_REFRESHED: 'auth_session_refreshed',
  SESSION_REVOKED: 'auth_session_revoked',
  LOGOUT_COMPLETED: 'auth_logout_completed',
  LOGOUT_ALL_COMPLETED: 'auth_logout_all_completed',
  VERIFICATION_REQUESTED: 'auth_verification_requested',
  VERIFICATION_SUCCEEDED: 'auth_verification_succeeded',
  VERIFICATION_FAILED: 'auth_verification_failed',
  PASSWORD_RESET_REQUESTED: 'auth_password_reset_requested',
  PASSWORD_RESET_COMPLETED: 'auth_password_reset_completed',
  PROVIDER_LINKED: 'auth_provider_linked',
  PROVIDER_UNLINKED: 'auth_provider_unlinked',
  PASSWORD_RESET_SESSION_REVOCATION_PENDING: 'auth.password_reset.session_revocation_pending',
} as const;

export type AuthDomainEvent =
  (typeof AuthDomainEvents)[keyof typeof AuthDomainEvents];