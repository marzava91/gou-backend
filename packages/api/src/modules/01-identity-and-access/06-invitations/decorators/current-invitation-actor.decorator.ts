import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentInvitationActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.user ?? null;
  },
);
