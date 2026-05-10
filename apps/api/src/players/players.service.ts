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

  async findById(id: string, requesterId?: string) {
    const jugador = await this.prisma.jugador.findUnique({
      where: { id },
      include: { usuario: { select: { id: true, nombre: true, email: true, createdAt: true } } },
    });
    if (!jugador) throw new NotFoundException({ error: { code: 'PLAYER_NOT_FOUND', message: 'Jugador no encontrado' } });

    // Respeta privacidad — campos sensibles ocultos para terceros
    const isOwner = requesterId === id;
    if (jugador.privacidad === 'privado' && !isOwner) {
      return { id: jugador.id, nombre: jugador.usuario.nombre, privacidad: jugador.privacidad };
    }

    return this.serialize(jugador, isOwner);
  }

  async update(id: string, requesterId: string, dto: UpdatePlayerDto) {
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
    return this.serialize(jugador, true);
  }

  async search(query: { q?: string; posicion?: string; page: number; limit: number }) {
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
      items: items.map((j) => this.serialize(j, false)),
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
  ) {
    return {
      id: jugador.id,
      nombre: jugador.usuario.nombre,
      posicion: jugador.posicion,
      pie_habil: jugador.pieHabil,
      fecha_nac: isOwner ? jugador.fechaNac?.toISOString().split('T')[0] ?? null : undefined,
      estatura_cm: jugador.estaturaCm,
      foto_url: jugador.fotoUrl,
      privacidad: jugador.privacidad,
      rating_actual: Number(jugador.ratingActual),
      disponibilidad: isOwner ? jugador.disponibilidad : undefined,
    };
  }
}
