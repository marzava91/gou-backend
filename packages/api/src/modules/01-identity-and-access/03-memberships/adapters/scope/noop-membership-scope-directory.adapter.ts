// packages/api/src/modules/01-identity-and-access/03-memberships/adapters/scope/noop-membership-scope-directory.adapter.ts

import { Injectable } from '@nestjs/common';
import { MembershipScopeDirectoryPort } from '../../ports/membership-scope-directory.port';

@Injectable()
export class NoopMembershipScopeDirectoryAdapter
  implements MembershipScopeDirectoryPort
{
  async tenantExists(): Promise<boolean> {
    return false;
  }

  async storeExists(): Promise<boolean> {
    return false;
  }

  async storeBelongsToTenant(): Promise<boolean> {
    return false;
  }
}