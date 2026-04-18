// packages/api/src/modules/01-identity-and-access/01-users/domain/errors/user.errors.ts

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

// NOT FOUND

export class UserNotFoundError extends NotFoundException {
  constructor() {
    super({
      code: 'user_not_found',
      message: 'user_not_found',
      statusCode: 404,
    });
  }
}

// DUPLICATES

export class DuplicatePrimaryEmailError extends ConflictException {
  constructor() {
    super({
      code: 'duplicate_primary_email',
      message: 'duplicate_primary_email',
      statusCode: 409,
    });
  }
}

export class DuplicatePrimaryPhoneError extends ConflictException {
  constructor() {
    super({
      code: 'duplicate_primary_phone',
      message: 'duplicate_primary_phone',
      statusCode: 409,
    });
  }
}

// CONTACT CHANGE VALIDATION

export class NewPrimaryEmailMatchesCurrentError extends ConflictException {
  constructor() {
    super({
      code: 'new_primary_email_matches_current',
      message: 'new_primary_email_matches_current',
      statusCode: 409,
    });
  }
}

export class NewPrimaryPhoneMatchesCurrentError extends ConflictException {
  constructor() {
    super({
      code: 'new_primary_phone_matches_current',
      message: 'new_primary_phone_matches_current',
      statusCode: 409,
    });
  }
}

// LIFECYCLE

export class InvalidUserStatusTransitionError extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'invalid_user_status_transition',
      message: 'invalid_user_status_transition',
      statusCode: 422,
    });
  }
}

export class UserAlreadyActiveError extends ConflictException {
  constructor() {
    super({
      code: 'user_already_active',
      message: 'user_already_active',
      statusCode: 409,
    });
  }
}

export class UserAlreadySuspendedError extends ConflictException {
  constructor() {
    super({
      code: 'user_already_suspended',
      message: 'user_already_suspended',
      statusCode: 409,
    });
  }
}

export class UserAlreadyDeactivatedError extends ConflictException {
  constructor() {
    super({
      code: 'user_already_deactivated',
      message: 'user_already_deactivated',
      statusCode: 409,
    });
  }
}

export class UserAlreadyAnonymizedError extends ConflictException {
  constructor() {
    super({
      code: 'user_already_anonymized',
      message: 'user_already_anonymized',
      statusCode: 409,
    });
  }
}

// VALIDATION

export class ContactVerificationRequiredError extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'contact_verification_required',
      message: 'contact_verification_required',
      statusCode: 422,
    });
  }
}

export class EmptyUserProfileUpdateError extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'empty_profile_update',
      message: 'empty_profile_update',
      statusCode: 422,
    });
  }
}

// CONCURRENCY

export class UserConcurrentModificationError extends ConflictException {
  constructor() {
    super({
      code: 'user_concurrent_modification',
      message: 'user_concurrent_modification',
      statusCode: 409,
    });
  }
}

// AUTHORIZATION

export class ForbiddenUserAccessError extends ForbiddenException {
  constructor() {
    super({
      code: 'forbidden_user_access',
      message: 'forbidden_user_access',
      statusCode: 403,
    });
  }
}