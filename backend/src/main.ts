import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap() {
  if (
    !process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_ACCESS_SECRET.length < 32
  ) {
    throw new Error('JWT_ACCESS_SECRET must be set to at least 32 characters');
  }
  if (
    !process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_REFRESH_SECRET.length < 32
  ) {
    throw new Error('JWT_REFRESH_SECRET must be set to at least 32 characters');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  // The browser never talks to this server directly (only through the Next.js
  // proxy), so CORS is intentionally not enabled.
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  // Keep the API private by default; set HOST=0.0.0.0 only when a private
  // container network requires it (never publish the API directly to browsers).
  await app.listen(Number(process.env.PORT ?? 3001), process.env.HOST ?? '127.0.0.1');
}

await bootstrap();
