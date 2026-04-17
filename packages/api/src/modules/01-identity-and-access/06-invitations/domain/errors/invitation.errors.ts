import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

export class InvitationNotFoundError extends NotFoundException {
  constructor() {
    super('invitation_not_found');
  }
}

export class InvalidInvitationTokenError extends BadRequestException {
  constructor() {
    super('invalid_invitation_token');
  }
}

export class InvitationExpiredError extends UnprocessableEntityException {
  constructor() {
    super('invitation_expired');
  }
}

export class InvitationRevokedError extends ConflictException {
  constructor() {
    super('invitation_revoked');
  }
}

export class InvitationAlreadyAcceptedError extends ConflictException {
  constructor() {
    super('invitation_already_accepted');
  }
}

export class InvitationRecipientMismatchError extends ConflictException {
  constructor() {
    super('invitation_recipient_mismatch');
  }
}

export class MembershipConflictError extends ConflictException {
  constructor() {
    super('membership_conflict');
  }
}

export class InvalidInvitationStatusTransitionError extends UnprocessableEntityException {
  constructor() {
    super('invalid_invitation_status_transition');
  }
}

export class InvitationAlreadyFinalizedError extends ConflictException {
  constructor() {
    super('invitation_already_finalized');
  }
}
