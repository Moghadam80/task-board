import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Every error leaves the API in one shape:
 * { statusCode, message, path, timestamp, requestId }.
 * Unexpected (5xx) errors are logged server-side and never leaked to clients.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'خطای داخلی سرور.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      message =
        typeof payload === 'string'
          ? payload
          : ((payload as { message?: string | string[] }).message ??
            'درخواست ناموفق بود.');
    } else if (isClientError(exception)) {
      // e.g. body-parser: malformed JSON / payload too large
      status = exception.status;
      message =
        status === HttpStatus.PAYLOAD_TOO_LARGE
          ? 'حجم درخواست بیش از حد مجاز است.'
          : 'درخواست نامعتبر است.';
    } else {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: response.getHeader('x-request-id') ?? null,
    });
  }
}

function isClientError(error: unknown): error is { status: number } {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}
