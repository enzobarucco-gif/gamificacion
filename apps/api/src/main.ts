import 'reflect-metadata';
import * as Sentry from '@sentry/node';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

const isProd = process.env['NODE_ENV'] === 'production';

if (process.env['SENTRY_DSN']) {
  Sentry.init({
    dsn: process.env['SENTRY_DSN'],
    environment: process.env['NODE_ENV'] ?? 'development',
    tracesSampleRate: isProd ? 0.1 : 1.0,
  });
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const pinoOptions = isProd
    ? { level: process.env['LOG_LEVEL'] ?? 'info' }
    : {
        level: 'debug',
        transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
      };

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: pinoOptions, genReqId: () => crypto.randomUUID() }),
    { rawBody: true },
  );

  app.setGlobalPrefix('api/v1');

  // Validación global — rechaza propiedades no declaradas en DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Filtro global — nunca exponer stack traces al cliente
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS — orígenes configurables por env
  const allowedOrigins = (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(',');
  await app.register(import('@fastify/cors' as never), {
    origin: allowedOrigins,
    credentials: true,
  });

  // Swagger — contrato canónico en /api/v1/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('PGD API')
    .setDescription('Plataforma de Gestión Deportiva — REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, document);

  const port = parseInt(process.env['API_PORT'] ?? '3001', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`API corriendo en http://localhost:${port}/api/v1`);
  logger.log(`Swagger en http://localhost:${port}/api/v1/docs`);
}

void bootstrap();
