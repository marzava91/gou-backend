// packages/api/src/modules/01-identity-and-access/03-memberships/decorators/current-membership-context.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentMembershipContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.membershipContext ?? null;
  },
);
