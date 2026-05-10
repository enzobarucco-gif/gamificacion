import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient } from '@pgd/db';
import { PRISMA_SERVICE } from '../database/database.module.js';
import type { UpdatePlayerDto } from './dto/update-player.dto.js';

@Injectable()
export class PlayersService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  async findById(id: string, requesterId?: string): Promise<Record<string, unknown>> {
    const [jugador, statsAgg, miembros] = await Promise.all([
      this.prisma.jugador.findUnique({
        where: { id },
        include: { usuario: { select: { id: true, nombre: true, email: true, createdAt: true } } },
      }),
      this.prisma.participacion.aggregate({
        where: { jugadorId: id },
        _sum: { goles: true, asistencias: true, atajadas: true },
        _count: { partidoId: true },
      }),
      this.prisma.equipoMiembro.findMany({
        where: { jugadorId: id, estado: 'activo' },
        include: { equipo: { select: { id: true, nombre: true } } },
      }),
    ]);

    if (!jugador) throw new NotFoundException({ error: { code: 'PLAYER_NOT_FOUND', message: 'Jugador no encontrado' } });

    const isOwner = requesterId === id;
    if (jugador.privacidad === 'privado' && !isOwner) {
      return { id: jugador.id, nombre: jugador.usuario.nombre, privacidad: jugador.privacidad };
    }

    return this.serialize(jugador, isOwner, statsAgg, miembros);
  }

  async update(id: string, requesterId: string, dto: UpdatePlayerDto): Promise<Record<string, unknown>> {
    if (id !== requesterId) throw new ForbiddenException({ error: { code: 'FORBIDDEN', message: 'Solo podés editar tu propio perfil' } });

    const jugador = await this.prisma.jugador.update({
      where: { id },
      data: {
        ...(dto.posicion !== undefined && { posicion: dto.posicion }),
        ...(dto.pie_habil !== undefined && { pieHabil: dto.pie_habil }),
        ...(dto.fecha_nac !== undefined && { fechaNac: new Date(dto.fecha_nac) }),
        ...(dto.estatura_cm !== undefined && { estaturaCm: dto.estatura_cm }),
        ...(dto.privacidad !== undefined && { privacidad: dto.privacidad }),
        ...(dto.foto_url !== undefined && { fotoUrl: dto.foto_url }),
      },
      include: { usuario: { select: { id: true, nombre: true, email: true, createdAt: true } } },
    });
    return this.serialize(jugador, true, null, []);
  }

  async search(query: { q?: string; posicion?: string; page: number; limit: number }): Promise<Record<string, unknown>> {
    const { q, posicion, page, limit } = query;
    const skip = (page - 1) * limit;

    const where = {
      privacidad: { in: ['publico', 'semipublico'] as string[] },
      ...(posicion && { posicion }),
      ...(q && { usuario: { nombre: { contains: q, mode: 'insensitive' as const } } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.jugador.findMany({
        where,
        skip,
        take: limit,
        include: { usuario: { select: { id: true, nombre: true } } },
        orderBy: { ratingActual: 'desc' },
      }),
      this.prisma.jugador.count({ where }),
    ]);

    return {
      items: items.map((j) => this.serialize(j, false, null, [])),
      page,
      limit,
      total,
    };
  }

  private serialize(
    jugador: {
      id: string;
      posicion: string | null;
      pieHabil: string | null;
      fechaNac: Date | null;
      estaturaCm: number | null;
      disponibilidad: unknown;
      fotoUrl: string | null;
      privacidad: string;
      ratingActual: unknown;
      usuario: { id: string; nombre: string; email?: string; createdAt?: Date };
    },
    isOwner: boolean,
    statsAgg: { _sum: { goles: number | null; asistencias: number | null; atajadas: number | null }; _count: { partidoId: number } } | null,
    miembros: Array<{ rol: string; equipo: { id: string; nombre: string } }>,
  ): Record<string, unknown> {
    return {
      id: jugador.id,
      nombre: jugador.usuario.nombre,
      avatar_url: jugador.fotoUrl,
      posicion: jugador.posicion,
      pie_habil: jugador.pieHabil,
      rating: Number(jugador.ratingActual),
      fecha_nac: isOwner ? jugador.fechaNac?.toISOString().split('T')[0] ?? null : undefined,
      estatura_cm: jugador.estaturaCm,
      privacidad: jugador.privacidad,
      disponibilidad: isOwner ? jugador.disponibilidad : undefined,
      stats: statsAgg
        ? {
            partidos: statsAgg._count.partidoId,
            goles: statsAgg._sum.goles ?? 0,
            asistencias: statsAgg._sum.asistencias ?? 0,
            atajadas: statsAgg._sum.atajadas ?? 0,
          }
        : { partidos: 0, goles: 0, asistencias: 0, atajadas: 0 },
      equipos: miembros.map((m) => ({ id: m.equipo.id, nombre: m.equipo.nombre, rol: m.rol })),
    };
  }
}
