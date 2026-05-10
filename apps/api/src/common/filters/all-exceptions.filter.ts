import {
  type ExceptionFilter,
  Catch,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        const r = response as Record<string, unknown>;
        message = (r['message'] as string) ?? exception.message;
        code = (r['error'] as string) ?? `HTTP_${status}`;
      } else {
        message = response as string;
        code = `HTTP_${status}`;
      }
    } else {
      // Log interno — nunca enviar stack al cliente
      this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
    }

    void reply.status(status).send({
      error: { code, message },
    });
  }
}
