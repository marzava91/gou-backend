export class RoleNotFoundError extends Error {
  constructor() {
    super('role_not_found');
  }
}

export class RoleAlreadyExistsError extends Error {
  constructor() {
    super('role_already_exists');
  }
}

export class InvalidRoleScopeError extends Error {
  constructor() {
    super('invalid_role_scope');
  }
}

export class RoleRetiredError extends Error {
  constructor() {
    super('role_retired');
  }
}

export class RoleMembershipScopeMismatchError extends Error {
  constructor() {
    super('role_membership_scope_mismatch');
  }
}

export class DuplicateRoleAssignmentError extends Error {
  constructor() {
    super('duplicate_role_assignment');
  }
}

export class RoleAssignmentNotFoundError extends Error {
  constructor() {
    super('role_assignment_not_found');
  }
}

export class InvalidRoleAssignmentTransitionError extends Error {
  constructor() {
    super('invalid_role_assignment_transition');
  }
}

export class RoleAssignmentMembershipNotFoundError extends Error {
  constructor() {
    super('role_assignment_membership_not_found');
  }
}

export class RoleAssignmentMembershipInactiveError extends Error {
  constructor() {
    super('role_assignment_membership_inactive');
  }
}