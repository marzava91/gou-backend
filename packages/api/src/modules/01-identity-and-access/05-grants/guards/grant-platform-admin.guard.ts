import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GrantAccessPolicy } from '../policies/grant-access.policy';
import { GrantAccessDeniedError } from '../domain/errors/grant.errors';

@Injectable()
export class GrantPlatformAdminGuard implements CanActivate {
  constructor(private readonly grantAccessPolicy: GrantAccessPolicy) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const actor = request.user ?? null;

    if (!this.grantAccessPolicy.canManageGrants(actor)) {
      throw new GrantAccessDeniedError();
    }

    return true;
  }
}