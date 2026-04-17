import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export class GrantTargetAmbiguousError extends BadRequestException {
  constructor() {
    super('Grant target is ambiguous or invalid for the selected targetType.');
  }
}

export class DuplicateActiveGrantError extends ConflictException {
  constructor() {
    super('An equivalent active grant already exists for this membership.');
  }
}

export class GrantMembershipNotFoundError extends NotFoundException {
  constructor() {
    super('Membership was not found for grant operation.');
  }
}

export class GrantMembershipInactiveError extends ConflictException {
  constructor() {
    super('Grant cannot be applied to a non-active membership.');
  }
}

export class GrantNotFoundError extends NotFoundException {
  constructor() {
    super('Grant was not found.');
  }
}

export class InvalidGrantTransitionError extends ConflictException {
  constructor() {
    super('Requested grant lifecycle transition is not valid.');
  }
}

export class GrantAccessDeniedError extends ForbiddenException {
  constructor() {
    super('Actor is not allowed to manage grants.');
  }
}

export class InvalidGrantValidityWindowError extends BadRequestException {
  constructor() {
    super(
      'Grant validity window is invalid. validUntil must be greater than validFrom.',
    );
  }
}
