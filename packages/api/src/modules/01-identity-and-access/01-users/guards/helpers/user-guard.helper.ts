// packages/api/src/modules/01-identity-and-access/01-users/guards/helpers/user-guard.helper.ts

import {
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedActor } from '../../domain/types/user.types';

export interface RequestWithAuthenticatedActor extends Request {
  user?: AuthenticatedActor;
  params?: Record<string, string | undefined>;
}

export function getRequestWithActor(
  context: ExecutionContext,
): RequestWithAuthenticatedActor {
  const request = 
    context.switchToHttp().getRequest<RequestWithAuthenticatedActor>();

  if (!request.user) {
    throw new UnauthorizedException('authentication_required');
  }

  return request;
}