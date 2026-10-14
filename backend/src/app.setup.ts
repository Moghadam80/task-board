import { INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';

/** Shared by main.ts and the e2e tests so both run the same request pipeline. */
export function configureApp(app: INestApplication): void {
  app.use((request: Request, response: Response, next: NextFunction) => {
    const supplied = request.header('x-request-id');
    const requestId = supplied && /^[a-zA-Z0-9._-]{8,80}$/.test(supplied) ? supplied : randomUUID();
    const startedAt = Date.now();
    response.setHeader('x-request-id', requestId);
    response.on('finish', () => {
      // Never log request bodies, cookies, credentials, or authorization headers.
      console.log(JSON.stringify({
        level: 'info',
        message: 'http_request',
        requestId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      }));
    });
    next();
  });
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true, // unknown fields are rejected
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();
}
