import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: Array<{ rol: string; scope_id: string | null }>;
  iat?: number;
  exp?: number;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtPayload => {
  const req = ctx.switchToHttp().getRequest<FastifyRequest & { user: JwtPayload }>();
  return req.user;
});
