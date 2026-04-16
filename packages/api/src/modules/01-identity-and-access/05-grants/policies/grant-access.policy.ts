import { Injectable } from '@nestjs/common';
import { GrantActor } from '../domain/types/grant.types';

@Injectable()
export class GrantAccessPolicy {
  canManageGrants(actor: GrantActor | null | undefined): boolean {
    return Boolean(actor?.isPlatformAdmin);
  }
}