import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

export class InvitationNotFoundError extends NotFoundException {
  constructor() {
    super({
      code: 'invitation_not_found',
      message: 'invitation_not_found',
      statusCode: 404,
    });
  }
}

export class InvalidInvitationTokenError extends BadRequestException {
  constructor() {
    super({
      code: 'invalid_invitation_token',
      message: 'invalid_invitation_token',
      statusCode: 400,
    });
  }
}

export class InvitationExpiredError extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'invitation_expired',
      message: 'invitation_expired',
      statusCode: 422,
    });
  }
}

export class InvitationRevokedError extends ConflictException {
  constructor() {
    super({
      code: 'invitation_revoked',
      message: 'invitation_revoked',
      statusCode: 409,
    });
  }
}

export class InvitationAlreadyAcceptedError extends ConflictException {
  constructor() {
    super({
      code: 'invitation_already_accepted',
      message: 'invitation_already_accepted',
      statusCode: 409,
    });
  }
}

export class InvitationRecipientMismatchError extends ConflictException {
  constructor() {
    super({
      code: 'invitation_recipient_mismatch',
      message: 'invitation_recipient_mismatch',
      statusCode: 409,
    });
  }
}

export class MembershipConflictError extends ConflictException {
  constructor() {
    super({
      code: 'membership_conflict',
      message: 'membership_conflict',
      statusCode: 409,
    });
  }
}

export class InvalidInvitationStatusTransitionError extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'invalid_invitation_status_transition',
      message: 'invalid_invitation_status_transition',
      statusCode: 422,
    });
  }
}

export class InvitationAlreadyFinalizedError extends ConflictException {
  constructor() {
    super({
      code: 'invitation_already_finalized',
      message: 'invitation_already_finalized',
      statusCode: 409,
    });
  }
}

export class InvalidInvitationExpirationError extends BadRequestException {
  constructor(
    message:
      | 'invalid_invitation_expiration'
      | 'invitation_expiration_must_be_future'
      | 'invitation_ttl_below_minimum'
      | 'invitation_ttl_exceeds_maximum' = 'invalid_invitation_expiration',
  ) {
    super({
      code: message,
      message,
      statusCode: 400,
    });
  }
}

export class InvalidInvitationScopeError extends BadRequestException {
  constructor(
    message:
      | 'invalid_invitation_scope'
      | 'tenant_scope_must_not_include_store'
      | 'store_scope_requires_store_id' = 'invalid_invitation_scope',
  ) {
    super({
      code: message,
      message,
      statusCode: 400,
    });
  }
}

export class EquivalentActiveInvitationExistsError extends ConflictException {
  constructor() {
    super({
      code: 'equivalent_active_invitation_exists',
      message: 'equivalent_active_invitation_exists',
      statusCode: 409,
    });
  }
}