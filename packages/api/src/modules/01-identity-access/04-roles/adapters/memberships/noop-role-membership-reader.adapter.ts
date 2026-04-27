import { Injectable } from '@nestjs/common';
import { RoleMembershipReaderPort } from '../../ports/role-membership-reader.port';

@Injectable()
export class NoopRoleMembershipReaderAdapter implements RoleMembershipReaderPort {
  async findMembershipById(): Promise<null> {
    return null;
  }
}
