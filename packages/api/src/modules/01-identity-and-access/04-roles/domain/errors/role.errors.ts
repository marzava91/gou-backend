import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export class RoleNotFoundError extends NotFoundException {
  constructor() {
    super({
      code: 'role_not_found',
      message: 'role_not_found',
      statusCode: 404,
    });
  }
}

export class RoleAlreadyExistsError extends ConflictException {
  constructor() {
    super({
      code: 'role_already_exists',
      message: 'role_already_exists',
      statusCode: 409,
    });
  }
}

export class InvalidRoleScopeError extends BadRequestException {
  constructor() {
    super({
      code: 'invalid_role_scope',
      message: 'invalid_role_scope',
      statusCode: 400,
    });
  }
}

export class RoleRetiredError extends ConflictException {
  constructor() {
    super({
      code: 'role_retired',
      message: 'role_retired',
      statusCode: 409,
    });
  }
}

export class RoleMembershipScopeMismatchError extends BadRequestException {
  constructor() {
    super({
      code: 'role_membership_scope_mismatch',
      message: 'role_membership_scope_mismatch',
      statusCode: 400,
    });
  }
}

export class DuplicateRoleAssignmentError extends ConflictException {
  constructor() {
    super({
      code: 'duplicate_role_assignment',
      message: 'duplicate_role_assignment',
      statusCode: 409,
    });
  }
}

export class RoleAssignmentNotFoundError extends NotFoundException {
  constructor() {
    super({
      code: 'role_assignment_not_found',
      message: 'role_assignment_not_found',
      statusCode: 404,
    });
  }
}

export class InvalidRoleAssignmentTransitionError extends ConflictException {
  constructor() {
    super({
      code: 'invalid_role_assignment_transition',
      message: 'invalid_role_assignment_transition',
      statusCode: 409,
    });
  }
}

export class RoleAssignmentMembershipNotFoundError extends NotFoundException {
  constructor() {
    super({
      code: 'role_assignment_membership_not_found',
      message: 'role_assignment_membership_not_found',
      statusCode: 404,
    });
  }
}

export class RoleAssignmentMembershipInactiveError extends ConflictException {
  constructor() {
    super({
      code: 'role_assignment_membership_inactive',
      message: 'role_assignment_membership_inactive',
      statusCode: 409,
    });
  }
}