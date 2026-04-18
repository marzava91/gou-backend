import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export class GrantTargetAmbiguousError extends BadRequestException {
  constructor() {
    super({
      code: 'grant_target_ambiguous',
      message: 'grant_target_ambiguous',
      statusCode: 400,
    });
  }
}

export class DuplicateActiveGrantError extends ConflictException {
  constructor() {
    super({
      code: 'duplicate_active_grant',
      message: 'duplicate_active_grant',
      statusCode: 409,
    });
  }
}

export class GrantMembershipNotFoundError extends NotFoundException {
  constructor() {
    super({
      code: 'grant_membership_not_found',
      message: 'grant_membership_not_found',
      statusCode: 404,
    });
  }
}

export class GrantMembershipInactiveError extends ConflictException {
  constructor() {
    super({
      code: 'grant_membership_inactive',
      message: 'grant_membership_inactive',
      statusCode: 409,
    });
  }
}

export class GrantNotFoundError extends NotFoundException {
  constructor() {
    super({
      code: 'grant_not_found',
      message: 'grant_not_found',
      statusCode: 404,
    });
  }
}

export class InvalidGrantTransitionError extends ConflictException {
  constructor() {
    super({
      code: 'invalid_grant_transition',
      message: 'invalid_grant_transition',
      statusCode: 409,
    });
  }
}

export class GrantAccessDeniedError extends ForbiddenException {
  constructor() {
    super({
      code: 'grant_access_denied',
      message: 'grant_access_denied',
      statusCode: 403,
    });
  }
}

export class InvalidGrantValidityWindowError extends BadRequestException {
  constructor() {
    super({
      code: 'invalid_grant_validity_window',
      message: 'invalid_grant_validity_window',
      statusCode: 400,
    });
  }
}