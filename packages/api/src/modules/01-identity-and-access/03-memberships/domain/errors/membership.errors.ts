import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export class MembershipNotFoundError extends NotFoundException {
  constructor() {
    super({
      code: 'membership_not_found',
      message: 'membership_not_found',
      statusCode: 404,
    });
  }
}

export class DuplicateMembershipError extends ConflictException {
  constructor() {
    super({
      code: 'duplicate_membership',
      message: 'duplicate_membership',
      statusCode: 409,
    });
  }
}

export class InvalidMembershipScopeError extends BadRequestException {
  constructor() {
    super({
      code: 'invalid_membership_scope',
      message: 'invalid_membership_scope',
      statusCode: 400,
    });
  }
}

export class InvalidMembershipTransitionError extends ConflictException {
  constructor() {
    super({
      code: 'invalid_membership_transition',
      message: 'invalid_membership_transition',
      statusCode: 409,
    });
  }
}

export class MembershipNotActiveError extends ConflictException {
  constructor() {
    super({
      code: 'membership_not_active',
      message: 'membership_not_active',
      statusCode: 409,
    });
  }
}

export class MembershipContextDeniedError extends ForbiddenException {
  constructor() {
    super({
      code: 'membership_context_denied',
      message: 'membership_context_denied',
      statusCode: 403,
    });
  }
}

export class MembershipScopeConflictError extends ConflictException {
  constructor() {
    super({
      code: 'membership_scope_conflict',
      message: 'membership_scope_conflict',
      statusCode: 409,
    });
  }
}

export class InvitationMembershipConflictError extends ConflictException {
  constructor() {
    super({
      code: 'invitation_membership_conflict',
      message: 'invitation_membership_conflict',
      statusCode: 409,
    });
  }
}