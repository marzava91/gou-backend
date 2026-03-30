// packages\api\src\modules\01_indentity_access\01_users\decorators\current-user.decorator.ts

import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedActor } from '../domain/types/user.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedActor => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthenticatedActor }>();

    if (!request.user) {
      throw new UnauthorizedException('authentication_required');
    }

    return request.user;
  },
);