// packages\api\src\modules\01-identity-and-access\02-auth\decorators\current-auth-actor.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedAuthActor } from '../domain/types/auth.types';

export const CurrentAuthActor = createParamDecorator(
  (
    _data: unknown,
    ctx: ExecutionContext,
  ): AuthenticatedAuthActor | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedAuthActor | undefined;
  },
);
