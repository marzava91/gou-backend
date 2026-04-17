// packages\api\src\integrations\firebase\firebase.module.ts
import { Global, Module } from '@nestjs/common';
import {
  FirebaseAdminProvider,
  FIREBASE_ADMIN,
} from './firebase-admin.provider';
import { FirebaseAdminService } from './firebase-admin.service';

@Global()
@Module({
  providers: [FirebaseAdminProvider, FirebaseAdminService],
  exports: [FIREBASE_ADMIN, FirebaseAdminService], // exporta el token para inyectarlo en otros módulos/servicios
})
export class FirebaseModule {}
