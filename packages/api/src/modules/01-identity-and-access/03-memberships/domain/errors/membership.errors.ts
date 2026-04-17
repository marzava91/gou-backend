// packages/api/src/modules/01-identity-and-access/03-memberships/domain/errors/membership.errors.ts

export class MembershipNotFoundError extends Error {
  constructor() {
    super('membership_not_found');
  }
}

export class DuplicateMembershipError extends Error {
  constructor() {
    super('duplicate_membership');
  }
}

export class InvalidMembershipScopeError extends Error {
  constructor() {
    super('invalid_membership_scope');
  }
}

export class InvalidMembershipTransitionError extends Error {
  constructor() {
    super('invalid_membership_transition');
  }
}

export class MembershipNotActiveError extends Error {
  constructor() {
    super('membership_not_active');
  }
}

export class MembershipContextDeniedError extends Error {
  constructor() {
    super('membership_context_denied');
  }
}

export class MembershipScopeConflictError extends Error {
  constructor() {
    super('membership_scope_conflict');
  }
}

export class InvitationMembershipConflictError extends Error {
  constructor() {
    super('invitation_membership_conflict');
  }
}
