import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch(HttpException)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const statusCode = exception.getStatus();
    const exceptionBody = exception.getResponse();
    const body = typeof exceptionBody === 'object' && exceptionBody !== null
      ? exceptionBody as { code?: unknown; message?: unknown }
      : undefined;
    const rawMessage = body?.message ?? exceptionBody;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : typeof rawMessage === 'string'
        ? rawMessage
        : exception.message;
    const code = typeof body?.code === 'string'
      ? body.code
      : statusCode === HttpStatus.BAD_REQUEST
        ? 'VALIDATION_ERROR'
        : statusCode === HttpStatus.UNAUTHORIZED
          ? 'UNAUTHORIZED'
          : statusCode === HttpStatus.TOO_MANY_REQUESTS
            ? 'RATE_LIMITED'
            : 'REQUEST_REJECTED';

    host.switchToHttp().getResponse<Response>().status(statusCode).json({
      statusCode,
      code,
      message,
    });
  }
}
