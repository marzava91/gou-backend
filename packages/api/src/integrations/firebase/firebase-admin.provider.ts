// integrations/firebase/firebase-admin.provider.ts
import { Provider } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';

export const FIREBASE_ADMIN = Symbol('FIREBASE_ADMIN');

export const FirebaseAdminProvider: Provider = {
  provide: FIREBASE_ADMIN,
  useFactory: async () => {
    if (admin.apps.length === 0) {
      const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (keyPath && fs.existsSync(keyPath)) {
        const sa = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(sa as any),
          projectId: sa.project_id ?? process.env.FIREBASE_PROJECT_ID,
        });
      } else {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      }
    }
    return admin.app();
  },
};
