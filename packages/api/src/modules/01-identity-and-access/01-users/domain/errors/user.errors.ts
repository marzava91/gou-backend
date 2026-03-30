// packages\api\src\modules\01-identity-and-access\01-users\domain\errors\user.errors.ts

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

export class UserNotFoundError extends NotFoundException {
  constructor() {
    super('user_not_found');
  }
}

export class DuplicatePrimaryEmailError extends ConflictException {
  constructor() {
    super('duplicate_primary_email');
  }
}

export class DuplicatePrimaryPhoneError extends ConflictException {
  constructor() {
    super('duplicate_primary_phone');
  }
}

export class NewPrimaryEmailMatchesCurrentError extends ConflictException {
  constructor() {
    super('new_primary_email_matches_current');
  }
}

export class NewPrimaryPhoneMatchesCurrentError extends ConflictException {
  constructor() {
    super('new_primary_phone_matches_current');
  }
}

export class InvalidUserStatusTransitionError extends UnprocessableEntityException {
  constructor() {
    super('invalid_status_transition');
  }
}

export class ContactVerificationRequiredError extends UnprocessableEntityException {
  constructor() {
    super('contact_verification_required');
  }
}

export class UserAlreadyActiveError extends ConflictException {
  constructor() {
    super('user_already_active');
  }
}

export class UserAlreadySuspendedError extends ConflictException {
  constructor() {
    super('user_already_suspended');
  }
}

export class UserAlreadyDeactivatedError extends ConflictException {
  constructor() {
    super('user_already_deactivated');
  }
}

export class UserAlreadyAnonymizedError extends ConflictException {
  constructor() {
    super('user_already_anonymized');
  }
}

export class UserConcurrentModificationError extends ConflictException {
  constructor() {
    super('user_concurrent_modification');
  }
}

export class ForbiddenUserAccessError extends ForbiddenException {
  constructor() {
    super('forbidden_user_access');
  }
}

export class EmptyUserProfileUpdateError extends UnprocessableEntityException {
  constructor() {
    super('empty_profile_update');
  }
}