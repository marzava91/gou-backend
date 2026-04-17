// packages\api\src\integrations\firebase\firebase-admin.service.ts
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type * as admin from 'firebase-admin';
import { FIREBASE_ADMIN } from './firebase-admin.provider';

@Injectable()
export class FirebaseAdminService {
  constructor(@Inject(FIREBASE_ADMIN) private readonly app: admin.app.App) {}

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await this.app.auth().verifyIdToken(idToken, true);
    } catch {
      throw new UnauthorizedException('Invalid Firebase token');
    }
  }
}
