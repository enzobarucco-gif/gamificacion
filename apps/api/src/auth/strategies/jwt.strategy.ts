import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PRISMA_SERVICE } from '../../database/database.module.js';
import { Inject } from '@nestjs/common';
import type { PrismaClient } from '@pgd/db';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<{ sub: string; email: string; roles: Array<{ rol: string; scope_id: string | null }> }> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: payload.sub, deletedAt: null },
      include: { roleAssignments: true },
    });

    if (!usuario) throw new UnauthorizedException({ error: { code: 'TOKEN_INVALID', message: 'Usuario no encontrado' } });

    return {
      sub: usuario.id,
      email: usuario.email,
      roles: usuario.roleAssignments.map((r) => ({ rol: r.rol, scope_id: r.scopeId })),
    };
  }
}
