// adapters/roles/noop-access-role-reader.adapter.ts
import { Injectable } from '@nestjs/common';
import { AccessRoleReaderPort } from '../../ports/access-role-reader.port';

@Injectable()
export class NoopAccessRoleReaderAdapter implements AccessRoleReaderPort {
  async listActiveMembershipCapabilities() {
    return [];
  }
}