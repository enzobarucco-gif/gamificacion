import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient } from '@pgd/db';
import { PRISMA_SERVICE } from '../database/database.module.js';

const ALLOWED_SCOPES = ['equipo', 'partido'] as const;
type ScopeTipo = (typeof ALLOWED_SCOPES)[number];

@Injectable()
export class ChatsService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  async getMessages(
    scopeTipo: string,
    scopeId: string,
    userId: string,
    opts: { before?: string; limit?: number },
  ): Promise<Array<Record<string, unknown>>> {
    this.assertScopeValido(scopeTipo);
    await this.assertAcceso(scopeTipo as ScopeTipo, scopeId, userId);

    const limit = Math.min(opts.limit ?? 50, 100);

    const mensajes = await this.prisma.chatMensaje.findMany({
      where: {
        scopeTipo,
        scopeId,
        ...(opts.before && { createdAt: { lt: new Date(opts.before) } }),
      },
      include: { autor: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return mensajes.reverse().map((m) => ({
      id: m.id,
      autor_id: m.autorId,
      autor_nombre: m.autor.nombre,
      texto: m.texto,
      created_at: m.createdAt.toISOString(),
    }));
  }

  async sendMessage(
    scopeTipo: string,
    scopeId: string,
    userId: string,
    texto: string,
  ): Promise<Record<string, unknown>> {
    this.assertScopeValido(scopeTipo);
    await this.assertAcceso(scopeTipo as ScopeTipo, scopeId, userId);

    const mensaje = await this.prisma.chatMensaje.create({
      data: { scopeTipo, scopeId, autorId: userId, texto },
      include: { autor: { select: { nombre: true } } },
    });

    return {
      id: mensaje.id,
      autor_id: mensaje.autorId,
      autor_nombre: mensaje.autor.nombre,
      texto: mensaje.texto,
      created_at: mensaje.createdAt.toISOString(),
    };
  }

  private assertScopeValido(scopeTipo: string): void {
    if (!ALLOWED_SCOPES.includes(scopeTipo as ScopeTipo)) {
      throw new NotFoundException({ error: { code: 'INVALID_SCOPE', message: `Scope inválido: ${scopeTipo}. Valores válidos: equipo, partido` } });
    }
  }

  private async assertAcceso(scopeTipo: ScopeTipo, scopeId: string, userId: string): Promise<void> {
    if (scopeTipo === 'equipo') {
      const miembro = await this.prisma.equipoMiembro.findFirst({
        where: { equipoId: scopeId, jugadorId: userId, estado: 'activo' },
      });
      if (!miembro) {
        throw new ForbiddenException({ error: { code: 'NOT_MEMBER', message: 'No sos miembro activo de este equipo' } });
      }
    } else if (scopeTipo === 'partido') {
      // Acceso si sos miembro de algún equipo que jugó el partido
      const partido = await this.prisma.partido.findFirst({
        where: {
          id: scopeId,
          equipos: {
            some: {
              equipo: {
                miembros: { some: { jugadorId: userId, estado: 'activo' } },
              },
            },
          },
        },
      });
      if (!partido) {
        throw new ForbiddenException({ error: { code: 'NOT_PARTICIPANT', message: 'No participaste en este partido' } });
      }
    }
  }
}
