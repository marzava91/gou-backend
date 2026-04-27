import { OperationalSurface } from '@prisma/client';
import {
  ActiveAccessContext,
  ResolvedAuthSession,
} from '../domain/types/access-resolution.types';

export const ACCESS_AUTH_READER_PORT = Symbol('ACCESS_AUTH_READER_PORT');

export interface AccessAuthReaderPort {
  findSessionByIdAndUserId(input: {
    sessionId: string;
    userId: string;
  }): Promise<ResolvedAuthSession | null>;

  getActiveContext(input: {
    userId: string;
    surface: OperationalSurface;
  }): Promise<ActiveAccessContext | null>;
}