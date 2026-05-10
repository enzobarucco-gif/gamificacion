import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RolSistema } from '@pgd/db';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { JwtPayload } from '../decorators/current-user.decorator.js';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RolSistema[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Sin @Roles() → solo requiere estar autenticado
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest<FastifyRequest & { user: JwtPayload & { roles: Array<{ rol: RolSistema; scope_id: string | null }> } }>();
    const user = req.user;

    if (!user?.roles) throw new ForbiddenException({ error: { code: 'FORBIDDEN', message: 'Sin permisos para este recurso' } });

    const hasRole = requiredRoles.some((role) =>
      user.roles.some((r) => r.rol === role),
    );

    if (!hasRole) throw new ForbiddenException({ error: { code: 'FORBIDDEN', message: 'Rol insuficiente para este recurso' } });

    return true;
  }
}
