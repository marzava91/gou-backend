// adapters/memberships/noop-access-membership-reader.adapter.ts
import { Injectable } from '@nestjs/common';
import { AccessMembershipReaderPort } from '../../ports/access-membership-reader.port';

@Injectable()
export class NoopAccessMembershipReaderAdapter implements AccessMembershipReaderPort {
  async findAuthorizationAnchorByMembershipId() {
    return null;
  }
}