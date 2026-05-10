import {
  type ExceptionFilter,
  Catch,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import * as Sentry from '@sentry/node';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        const r = response as Record<string, unknown>;
        const nested = r['error'];
        if (typeof nested === 'object' && nested !== null) {
          const ne = nested as Record<string, unknown>;
          code = (ne['code'] as string) ?? `HTTP_${status}`;
          message = (ne['message'] as string) ?? exception.message;
        } else {
          message = (r['message'] as string) ?? exception.message;
          code = (r['error'] as string) ?? `HTTP_${status}`;
        }
      } else {
        message = response as string;
        code = `HTTP_${status}`;
      }
    } else {
      // Unhandled — capturar en Sentry y loguear localmente
      const errMsg = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error({ reqId: req.id, msg: 'Unhandled exception', err: errMsg });
      Sentry.captureException(exception, { extra: { reqId: req.id, url: req.url, method: req.method } });
    }

    void reply.status(status).send({
      error: { code, message },
    });
  }
}
