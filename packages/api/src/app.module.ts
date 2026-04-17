// Módulo raíz que importa los módulos de negocio y módulos técnicos (config, prisma, etc.).
// Best practice: mantenerlo delgado; toda dependencia va a módulos específicos.

import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/authentication/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SettingsModule } from './modules/settings/settings.module';
import { FirebaseModule } from './integrations/firebase/firebase.module';
import { ConfigModule } from '@nestjs/config';
import { PricingModule } from './modules/pricing/pricing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FirebaseModule,
    AppConfigModule,
    PrismaModule,
    AuthModule,
    CatalogModule,
    PricingModule,
    OrdersModule,
    SettingsModule,
  ],
})
export class AppModule {}
