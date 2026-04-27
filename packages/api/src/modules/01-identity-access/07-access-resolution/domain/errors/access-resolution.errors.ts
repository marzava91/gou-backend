// packages/api/src/modules/01-identity-and-access/07-access-resolution/domain/errors/access-resolution.errors.ts

import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';

export class InvalidAccessSessionError extends UnauthorizedException {
  constructor() {
    super({
      code: 'auth_session_invalid',
      message: 'auth_session_invalid',
      statusCode: 401,
    });
  }
}

export class AccessContextNotResolvedError extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'access_context_not_resolved',
      message: 'access_context_not_resolved',
      statusCode: 422,
    });
  }
}

export class InvalidActiveMembershipError extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'invalid_active_membership',
      message: 'invalid_active_membership',
      statusCode: 422,
    });
  }
}

export class MembershipScopeMismatchError extends ForbiddenException {
  constructor() {
    super({
      code: 'membership_scope_mismatch',
      message: 'membership_scope_mismatch',
      statusCode: 403,
    });
  }
}

export class SurfaceScopeConflictError extends ConflictException {
  constructor() {
    super({
      code: 'surface_scope_conflict',
      message: 'surface_scope_conflict',
      statusCode: 409,
    });
  }
}

export class AuthorizationUnresolvableError extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'authorization_unresolvable',
      message: 'authorization_unresolvable',
      statusCode: 422,
    });
  }
}