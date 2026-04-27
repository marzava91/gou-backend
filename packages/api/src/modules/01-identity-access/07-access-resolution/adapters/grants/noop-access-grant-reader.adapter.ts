// adapters/grants/noop-access-grant-reader.adapter.ts
import { Injectable } from '@nestjs/common';
import { AccessGrantReaderPort } from '../../ports/access-grant-reader.port';

@Injectable()
export class NoopAccessGrantReaderAdapter implements AccessGrantReaderPort {
  async listMembershipGrants() {
    return [];
  }
}