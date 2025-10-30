import { Global, Module } from '@nestjs/common';
import { FirebaseAdminProvider, FIREBASE_ADMIN } from './firebase-admin.provider';

@Global()
@Module({
  providers: [FirebaseAdminProvider],
  exports: [FIREBASE_ADMIN], // exporta el token para inyectarlo en otros módulos/servicios
})
export class FirebaseModule {}
