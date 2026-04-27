// Módulo raíz que importa los módulos de negocio y módulos técnicos (config, prisma, etc.).
// Best practice: mantenerlo delgado; toda dependencia va a módulos específicos.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { FirebaseModule } from './integrations/firebase/firebase.module';
import { IdentityAccessModule } from './modules/01-identity-access/identity-access.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppConfigModule,
    PrismaModule,
    FirebaseModule,
    IdentityAccessModule,
  ],
})
export class AppModule {}