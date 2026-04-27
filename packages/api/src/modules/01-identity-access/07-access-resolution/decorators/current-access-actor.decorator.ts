import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentAccessActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return request.user ?? null;
  },
);