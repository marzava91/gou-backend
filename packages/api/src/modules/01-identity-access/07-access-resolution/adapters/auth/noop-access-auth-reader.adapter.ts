// adapters/auth/noop-access-auth-reader.adapter.ts
import { Injectable } from '@nestjs/common';
import { OperationalSurface } from '@prisma/client';
import { AccessAuthReaderPort } from '../../ports/access-auth-reader.port';

@Injectable()
export class NoopAccessAuthReaderAdapter implements AccessAuthReaderPort {
  async findSessionByIdAndUserId() {
    return null;
  }

  async getActiveContext(_input: { userId: string; surface: OperationalSurface }) {
    return null;
  }
}