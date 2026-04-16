import { Injectable } from '@nestjs/common';
import { GrantMembershipReaderPort } from '../../ports/grant-membership-reader.port';

@Injectable()
export class NoopGrantMembershipReaderAdapter implements GrantMembershipReaderPort {
  async findMembershipById(): Promise<null> {
    return null;
  }
}