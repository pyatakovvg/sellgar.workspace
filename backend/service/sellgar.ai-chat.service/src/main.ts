import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './api/http-exception.filter';
import { CanonicalEventPublisher } from './classes/event/canonical-event.publisher';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = Number(config.get('PORT') ?? 3010);
  const origins = String(config.get('CORS_ORIGIN') ?? 'http://localhost:5173').split(',');

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: origins, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.get(CanonicalEventPublisher).connect(app.getHttpServer(), origins);

  await app.listen(port);
  new Logger('Bootstrap').log(`AI Chat service listens on ${port}.`);
}

void bootstrap();
