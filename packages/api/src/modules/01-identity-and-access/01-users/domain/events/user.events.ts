// packages\api\src\modules\01-identity-and-access\01-users\domain\events\user.events.ts

export const UserDomainEvents = {
  USER_CREATED: 'user_created',
  USER_PROFILE_UPDATED: 'user_profile_updated',
  USER_PRIMARY_EMAIL_CHANGE_REQUESTED: 'user_primary_email_change_requested',
  USER_PRIMARY_EMAIL_CHANGED: 'user_primary_email_changed',
  USER_PRIMARY_PHONE_CHANGE_REQUESTED: 'user_primary_phone_change_requested',
  USER_PRIMARY_PHONE_CHANGED: 'user_primary_phone_changed',
  USER_SUSPENDED: 'user_suspended',
  USER_REACTIVATED: 'user_reactivated',
  USER_DEACTIVATED: 'user_deactivated',
  USER_ANONYMIZED: 'user_anonymized',
  USER_MERGED: 'user_merged',
} as const;

export type UserDomainEventName =
  (typeof UserDomainEvents)[keyof typeof UserDomainEvents];