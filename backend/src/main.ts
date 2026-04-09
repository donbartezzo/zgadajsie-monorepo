import 'reflect-metadata';

/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app/app.module';
import { DecimalSerializationInterceptor } from './app/interceptors/decimal-serialization.interceptor';
import { etagMiddleware } from './app/middleware/etag.middleware';

async function bootstrap() {
  const backendUrl = process.env.BACKEND_URL;
  const frontendUrl = process.env.FRONTEND_URL;

  if (!backendUrl) {
    throw new Error('BACKEND_URL is not defined in environment variables');
  }
  if (!frontendUrl) {
    throw new Error('FRONTEND_URL is not defined in environment variables');
  }

  const port = new URL(backendUrl).port || '3000';

  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(etagMiddleware);

  app.enableCors({
    origin: frontendUrl.split(','),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new DecimalSerializationInterceptor());

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  await app.listen(port);
  Logger.log(`🚀 Application is running on: ${backendUrl}/${globalPrefix}`);
}

bootstrap();
