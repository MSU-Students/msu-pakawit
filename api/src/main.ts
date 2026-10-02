import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('MSUPakawitBootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend PWA client
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global prefix for API routes
  app.setGlobalPrefix('api');

  // Global validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('MSU Pakawit API')
    .setDescription(
      'Offline-First Peer-to-Peer Micro-Storefront & Errand Network for Mindanao State University (Sprint 0 Inception API Architecture)',
    )
    .setVersion('0.1.0')
    .addTag('Virtual Storefront & Catalog (Team 1)')
    .addTag('Dispatch & Courier Logistics (Team 2)')
    .addTag('Offline Sync & Reconciliation (Team 3)')
    .addTag('Identity, Security & Guardrails (Team 4)')
    .addTag('Shared Platform & Health (Team 5)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 5000;
  await app.listen(port);
  logger.log(`🚀 MSU Pakawit API is running on: http://localhost:${port}/api`);
  logger.log(`📚 Swagger API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
