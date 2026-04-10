// packages/api/src/modules/01-identity-and-access/02-auth/adapters/providers/firebase/firebase-admin.provider.ts

import { Injectable } from '@nestjs/common';
import {
  getAuth,
  type DecodedIdToken,
  type UserRecord,
} from 'firebase-admin/auth';

/**
 * Thin wrapper around Firebase Admin Auth.
 *
 * Goal:
 * - keep raw SDK calls out of the Auth provider adapter
 * - centralize Firebase-specific operations in one place
 *
 * Assumption:
 * - Firebase Admin has already been initialized elsewhere in the app bootstrap
 *   using the default Firebase app.
 */
@Injectable()
export class FirebaseAdminProvider {
  async verifyIdToken(
    idToken: string,
    checkRevoked = false,
  ): Promise<DecodedIdToken> {
    return getAuth().verifyIdToken(idToken, checkRevoked);
  }

  async getUser(uid: string): Promise<UserRecord> {
    return getAuth().getUser(uid);
  }

  async getUserByEmail(email: string): Promise<UserRecord> {
    return getAuth().getUserByEmail(email);
  }

  async getUserByPhoneNumber(phoneNumber: string): Promise<UserRecord> {
    return getAuth().getUserByPhoneNumber(phoneNumber);
  }

  async generatePasswordResetLink(email: string): Promise<string> {
    return getAuth().generatePasswordResetLink(email);
  }

  async updateUserPassword(uid: string, newPassword: string): Promise<UserRecord> {
    return getAuth().updateUser(uid, {
      password: newPassword,
    });
  }
}