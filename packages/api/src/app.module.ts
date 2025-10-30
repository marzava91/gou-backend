// Módulo raíz que importa los módulos de negocio y módulos técnicos (config, prisma, etc.).
// Best practice: mantenerlo delgado; toda dependencia va a módulos específicos.

import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/authentication/auth.module';
import { PersonalizationModule } from './modules/personalization/personalization.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { OrdersModule } from './modules/orders/orders.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { FirebaseModule } from './integrations/firebase/firebase.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FirebaseModule,
    AppConfigModule,
    PrismaModule,
    AuthModule,
    PersonalizationModule,
    CatalogModule,
    OrdersModule,
    MarketingModule,
    SettingsModule,
    ObservabilityModule,
  ],
})
export class AppModule {}

