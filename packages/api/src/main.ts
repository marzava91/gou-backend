// RAIZ DEL PROYECTO
// Punto de entrada principal de la aplicación API utilizando el framework NestJS. 
// Arranca la app Nest. Configura global pipes (validación), prefijos (/v1), CORS, 
// filtros de errores, interceptores, Swagger y shutdown hooks.
// Best practice: habilita ValidationPipe({ whitelist:true, forbidNonWhitelisted:true, 
// transform:true }), helmet, compresión, y enableShutdownHooks().

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AllExceptionsFilter } from './common/errors/exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1');

  // Seguridad
  app.use(helmet());

  // Compresión de responses
  app.use(compression());

  // CORS
  app.enableCors({ origin: true, credentials: true });

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Filtros e interceptores globales
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('GOU Backend API')
    .setDescription('GOU API v1')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  console.log(`✅ Backend running on http://localhost:${port}`);
  console.log(`✅ Swagger → http://localhost:${port}/docs`);
}

bootstrap();
