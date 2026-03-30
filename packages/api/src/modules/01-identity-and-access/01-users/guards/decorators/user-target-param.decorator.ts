// packages/api/src/modules/01-identity-and-access/01-users/guards/decorators/user-target-param.decorator.ts

import { SetMetadata } from '@nestjs/common';

export const USER_TARGET_PARAM_KEY = 'userTargetParam';

export const UserTargetParam = (paramName: string) =>
  SetMetadata(USER_TARGET_PARAM_KEY, paramName);