import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { PrismaClient } from '@pgd/db';
import { PRISMA_SERVICE } from '../database/database.module.js';

const TIPOS_VALIDOS = ['cancha', 'partido'] as const;
type TipoObjeto = (typeof TIPOS_VALIDOS)[number];

export interface CreateReviewInput {
  tipo_objeto: string;
  objeto_id: string;
  puntaje: number;
  comentario?: string;
}

@Injectable()
export class ReviewsService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  async create(userId: string, input: CreateReviewInput): Promise<Record<string, unknown>> {
    if (!TIPOS_VALIDOS.includes(input.tipo_objeto as TipoObjeto)) {
      throw new BadRequestException({
        error: { code: 'INVALID_TYPE', message: `tipo_objeto inválido. Valores: ${TIPOS_VALIDOS.join(', ')}` },
      });
    }

    // Verificar que el objeto existe
    await this.assertObjetoExiste(input.tipo_objeto as TipoObjeto, input.objeto_id);

    const resena = await this.prisma.resena.create({
      data: {
        autorId: userId,
        tipoObjeto: input.tipo_objeto,
        objetoId: input.objeto_id,
        puntaje: input.puntaje,
        ...(input.comentario !== undefined && { comentario: input.comentario }),
      },
      include: { autor: { select: { nombre: true } } },
    });

    // Actualizar rating promedio si es una cancha
    if (input.tipo_objeto === 'cancha') {
      await this.actualizarRatingCancha(input.objeto_id);
    }

    return this.serialize(resena);
  }

  async list(query: { tipo_objeto?: string; objeto_id?: string; page?: number; limit?: number }): Promise<Record<string, unknown>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where = {
      ...(query.tipo_objeto && { tipoObjeto: query.tipo_objeto }),
      ...(query.objeto_id && { objetoId: query.objeto_id }),
    };

    const [items, total] = await Promise.all([
      this.prisma.resena.findMany({
        where,
        include: { autor: { select: { nombre: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.resena.count({ where }),
    ]);

    return { items: items.map((r) => this.serialize(r)), page, limit, total };
  }

  private async assertObjetoExiste(tipo: TipoObjeto, objetoId: string): Promise<void> {
    if (tipo === 'cancha') {
      const cancha = await this.prisma.cancha.findFirst({ where: { id: objetoId, deletedAt: null } });
      if (!cancha) throw new BadRequestException({ error: { code: 'VENUE_NOT_FOUND', message: 'Cancha no encontrada' } });
    } else if (tipo === 'partido') {
      const partido = await this.prisma.partido.findUnique({ where: { id: objetoId } });
      if (!partido) throw new BadRequestException({ error: { code: 'MATCH_NOT_FOUND', message: 'Partido no encontrado' } });
    }
  }

  private async actualizarRatingCancha(canchaId: string): Promise<void> {
    const agg = await this.prisma.resena.aggregate({
      where: { tipoObjeto: 'cancha', objetoId: canchaId },
      _avg: { puntaje: true },
    });
    const avg = agg._avg.puntaje ?? 0;
    await this.prisma.cancha.update({
      where: { id: canchaId },
      data: { rating: Math.round(avg * 100) / 100 },
    });
  }

  private serialize(r: {
    id: string;
    autorId: string | null;
    tipoObjeto: string;
    objetoId: string;
    puntaje: number | null;
    comentario: string | null;
    createdAt: Date;
    autor?: { nombre: string } | null;
  }): Record<string, unknown> {
    return {
      id: r.id,
      autor_id: r.autorId,
      autor_nombre: r.autor?.nombre ?? null,
      tipo_objeto: r.tipoObjeto,
      objeto_id: r.objetoId,
      puntaje: r.puntaje,
      comentario: r.comentario,
      created_at: r.createdAt.toISOString(),
    };
  }
}
