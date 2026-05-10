import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient } from '@pgd/db';
import type Redis from 'ioredis';
import { PRISMA_SERVICE } from '../database/database.module.js';
import { REDIS_CLIENT } from '../redis/redis.module.js';
import type { CreateMatchDto } from './dto/create-match.dto.js';
import type { LoadStatsDto } from './dto/load-stats.dto.js';
import type { ValidateMatchDto } from './dto/validate-match.dto.js';
import type { OpenDisputeDto } from './dto/open-dispute.dto.js';
import type { JwtPayload } from '../common/decorators/current-user.decorator.js';

const VALIDATE_TTL = 60 * 60 * 24 * 7; // 7 días

@Injectable()
export class MatchesService {
  constructor(
    @Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async create(userId: string, dto: CreateMatchDto): Promise<Record<string, unknown>> {
    const campo = dto.campo_id
      ? await this.prisma.campo.findUnique({ where: { id: dto.campo_id }, include: { cancha: true } })
      : null;
    if (dto.campo_id && !campo) {
      throw new NotFoundException({ error: { code: 'FIELD_NOT_FOUND', message: 'Campo no encontrado' } });
    }

    const partido = await this.prisma.partido.create({
      data: {
        fecha: new Date(dto.fecha),
        modalidad: dto.modalidad,
        ...(campo && { campoId: campo.id, canchaId: campo.cancha.id }),
      },
    });

    // Registrar equipos si se especifican
    if (dto.equipo_a_id) {
      await this.prisma.partidoEquipo.create({
        data: { partidoId: partido.id, equipoId: dto.equipo_a_id, esLocal: true },
      });
    }
    if (dto.equipo_b_id) {
      await this.prisma.partidoEquipo.create({
        data: { partidoId: partido.id, equipoId: dto.equipo_b_id, esLocal: false },
      });
    }

    return this.serializePartido(partido, []);
  }

  async findById(partidoId: string): Promise<Record<string, unknown>> {
    const partido = await this.prisma.partido.findUnique({
      where: { id: partidoId },
      include: {
        equipos: { include: { equipo: { select: { id: true, nombre: true, avatarUrl: true } } } },
        participaciones: {
          include: { jugador: { include: { usuario: { select: { nombre: true } } } } },
        },
        disputas: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!partido) throw new NotFoundException({ error: { code: 'MATCH_NOT_FOUND', message: 'Partido no encontrado' } });
    return this.serializePartido(partido, partido.participaciones);
  }

  async findMyMatches(userId: string, query: { from?: string; to?: string; estado?: string }): Promise<Array<Record<string, unknown>>> {
    const miEquipos = await this.prisma.equipoMiembro.findMany({
      where: { jugadorId: userId, estado: 'activo' },
      select: { equipoId: true },
    });
    const equipoIds = miEquipos.map((m) => m.equipoId);

    const partidos = await this.prisma.partido.findMany({
      where: {
        equipos: { some: { equipoId: { in: equipoIds } } },
        ...(query.from && { fecha: { gte: new Date(query.from) } }),
        ...(query.to && { fecha: { lte: new Date(query.to) } }),
        ...(query.estado && { estado: query.estado as never }),
      },
      include: {
        equipos: { include: { equipo: { select: { id: true, nombre: true } } } },
        participaciones: false,
        disputas: false,
      },
      orderBy: { fecha: 'desc' },
    });

    return partidos.map((p) => this.serializePartido(p, []));
  }

  async loadStats(partidoId: string, user: JwtPayload, dto: LoadStatsDto): Promise<{ status: string }> {
    const partido = await this.findPartidoOrFail(partidoId);
    if (partido.estadoValidacion === 'validado') {
      throw new ConflictException({ error: { code: 'MATCH_ALREADY_VALIDATED', message: 'El partido ya fue validado' } });
    }

    // Solo el capitán de un equipo que juega puede cargar stats
    const miEquipo = await this.assertEsCapitanEnPartido(partidoId, user);

    // Verificar que todos los jugadores pertenecen al equipo
    const miembros = await this.prisma.equipoMiembro.findMany({
      where: { equipoId: miEquipo.equipoId ?? '', estado: 'activo' },
      select: { jugadorId: true },
    });
    const miembrosIds = new Set(miembros.map((m) => m.jugadorId));

    for (const p of dto.participaciones) {
      if (!miembrosIds.has(p.jugador_id)) {
        throw new ForbiddenException({
          error: { code: 'PLAYER_NOT_IN_TEAM', message: `El jugador ${p.jugador_id} no pertenece a tu equipo` },
        });
      }
    }

    // Upsert participaciones
    await Promise.all(
      dto.participaciones.map((p) =>
        this.prisma.participacion.upsert({
          where: { partidoId_jugadorId: { partidoId, jugadorId: p.jugador_id } },
          update: {
            ...(p.minutos !== undefined && { minutos: p.minutos }),
            ...(p.goles !== undefined && { goles: p.goles }),
            ...(p.asistencias !== undefined && { asistencias: p.asistencias }),
            ...(p.atajadas !== undefined && { atajadas: p.atajadas }),
            ...(p.calificacion !== undefined && { calificacion: p.calificacion }),
            ...(p.notas !== undefined && { notas: p.notas }),
            cargadoPorId: user.sub,
          },
          create: {
            partidoId,
            jugadorId: p.jugador_id,
            minutos: p.minutos ?? 0,
            goles: p.goles ?? 0,
            asistencias: p.asistencias ?? 0,
            atajadas: p.atajadas ?? 0,
            ...(p.calificacion !== undefined && { calificacion: p.calificacion }),
            ...(p.notas !== undefined && { notas: p.notas }),
            cargadoPorId: user.sub,
          },
        }),
      ),
    );

    return { status: 'stats_cargadas' };
  }

  async validate(partidoId: string, user: JwtPayload, dto: ValidateMatchDto): Promise<Record<string, unknown>> {
    const partido = await this.findPartidoOrFail(partidoId);

    if (partido.estadoValidacion === 'validado') {
      throw new ConflictException({ error: { code: 'MATCH_ALREADY_VALIDATED', message: 'El partido ya fue validado' } });
    }

    const miEquipo = await this.assertEsCapitanEnPartido(partidoId, user);
    const equipoId = miEquipo.equipoId ?? user.sub;

    if (!dto.ok) {
      // Rechazar → disputa inmediata
      await this.prisma.partido.update({
        where: { id: partidoId },
        data: { estadoValidacion: 'disputa' },
      });
      await this.prisma.disputa.create({
        data: {
          partidoId,
          motivo: dto.observaciones ?? 'Capitán rechazó el resultado',
          abiertaPorId: user.sub,
        },
      });
      return this.findById(partidoId);
    }

    // Registrar validación en Redis
    const key = `match:validate:${partidoId}`;
    await this.redis.hset(key, equipoId, 'ok');
    await this.redis.expire(key, VALIDATE_TTL);

    // Obtener todos los equipos del partido
    const equiposEnPartido = await this.prisma.partidoEquipo.findMany({ where: { partidoId } });
    const todosValidaron = equiposEnPartido.every(
      (pe) => pe.equipoId === null || true, // partido sin equipos se valida con 1 capitán
    );

    const validaciones = await this.redis.hgetall(key);
    const equipoConEquipoId = equiposEnPartido.filter((pe) => pe.equipoId !== null);

    const todosAceptaron =
      equipoConEquipoId.length === 0 ||
      equipoConEquipoId.every((pe) => pe.equipoId !== null && validaciones[pe.equipoId] === 'ok');

    let nuevoEstado: 'parcial' | 'validado' = 'parcial';
    if (todosAceptaron && equipoConEquipoId.length > 0) {
      nuevoEstado = 'validado';

      // Marcar participaciones como validadas
      await this.prisma.participacion.updateMany({
        where: { partidoId },
        data: { validadoPorId: user.sub },
      });

      await this.redis.del(key);
    }

    await this.prisma.partido.update({
      where: { id: partidoId },
      data: {
        estadoValidacion: nuevoEstado,
        ...(nuevoEstado === 'validado' && { estado: 'jugado' }),
      },
    });

    return this.findById(partidoId);
  }

  async openDispute(partidoId: string, userId: string, dto: OpenDisputeDto): Promise<Record<string, unknown>> {
    const partido = await this.findPartidoOrFail(partidoId);
    if (partido.estadoValidacion === 'validado') {
      throw new ConflictException({ error: { code: 'MATCH_ALREADY_VALIDATED', message: 'El partido ya fue validado, no se puede disputar' } });
    }

    const disputa = await this.prisma.disputa.create({
      data: {
        partidoId,
        ...(dto.motivo !== undefined && { motivo: dto.motivo }),
        abiertaPorId: userId,
      },
    });

    await this.prisma.partido.update({
      where: { id: partidoId },
      data: { estadoValidacion: 'disputa' },
    });

    return {
      id: disputa.id,
      partido_id: disputa.partidoId,
      motivo: disputa.motivo,
      estado: disputa.estado,
      created_at: disputa.createdAt.toISOString(),
    };
  }

  async closeDispute(disputaId: string, userId: string, resolucion: string): Promise<Record<string, unknown>> {
    const disputa = await this.prisma.disputa.findUnique({ where: { id: disputaId } });
    if (!disputa) throw new NotFoundException({ error: { code: 'DISPUTE_NOT_FOUND', message: 'Disputa no encontrada' } });
    if (disputa.estado === 'cerrada') {
      throw new ConflictException({ error: { code: 'DISPUTE_ALREADY_CLOSED', message: 'La disputa ya fue cerrada' } });
    }

    const updated = await this.prisma.disputa.update({
      where: { id: disputaId },
      data: { estado: 'cerrada', resolucion, cerradaPorId: userId, closedAt: new Date() },
    });

    await this.prisma.partido.update({
      where: { id: disputa.partidoId },
      data: { estadoValidacion: 'validado', estado: 'jugado' },
    });

    return {
      id: updated.id,
      partido_id: updated.partidoId,
      estado: updated.estado,
      resolucion: updated.resolucion,
      closed_at: updated.closedAt?.toISOString(),
    };
  }

  private async findPartidoOrFail(partidoId: string) {
    const partido = await this.prisma.partido.findUnique({ where: { id: partidoId } });
    if (!partido) throw new NotFoundException({ error: { code: 'MATCH_NOT_FOUND', message: 'Partido no encontrado' } });
    return partido;
  }

  private async assertEsCapitanEnPartido(partidoId: string, user: JwtPayload) {
    const equiposEnPartido = await this.prisma.partidoEquipo.findMany({ where: { partidoId } });
    const equipoIds = equiposEnPartido.map((pe) => pe.equipoId).filter(Boolean) as string[];

    // Verificar que el user es capitán de alguno de los equipos
    const rolCapitan = user.roles.find(
      (r) => r.rol === 'capitan' && r.scope_id !== null && equipoIds.includes(r.scope_id),
    );

    // También aceptar super_admin
    const isSuperAdmin = user.roles.some((r) => r.rol === 'super_admin');

    if (!rolCapitan && !isSuperAdmin) {
      throw new ForbiddenException({
        error: { code: 'FORBIDDEN', message: 'Solo el capitán de un equipo en el partido puede realizar esta acción' },
      });
    }

    const equipoId = rolCapitan?.scope_id ?? equipoIds[0] ?? null;
    return equiposEnPartido.find((pe) => pe.equipoId === equipoId) ?? equiposEnPartido[0]!;
  }

  private serializePartido(
    partido: {
      id: string;
      fecha: Date;
      modalidad: string;
      estado: string;
      estadoValidacion: string;
      canchaId: string | null;
      campoId: string | null;
      createdAt: Date;
      equipos?: Array<{
        id: string;
        equipoId: string | null;
        esLocal: boolean | null;
        goles: number;
        equipo?: { id: string; nombre: string; avatarUrl?: string | null } | null;
      }>;
      disputas?: Array<{ id: string; estado: string; motivo: string | null }>;
    },
    participaciones: Array<{
      partidoId: string;
      jugadorId: string;
      goles: number;
      asistencias: number;
      atajadas: number;
      minutos: number;
      calificacion: number | null;
      notas: string | null;
      jugador?: { usuario: { nombre: string } };
    }>,
  ): Record<string, unknown> {
    return {
      id: partido.id,
      fecha: partido.fecha.toISOString(),
      modalidad: partido.modalidad,
      estado: partido.estado,
      estado_validacion: partido.estadoValidacion,
      cancha_id: partido.canchaId,
      campo_id: partido.campoId,
      created_at: partido.createdAt.toISOString(),
      equipos: (partido.equipos ?? []).map((pe) => ({
        equipo_id: pe.equipoId,
        nombre: pe.equipo?.nombre ?? null,
        es_local: pe.esLocal,
        goles: pe.goles,
      })),
      stats: participaciones.map((p) => ({
        jugador_id: p.jugadorId,
        nombre: p.jugador?.usuario.nombre ?? null,
        goles: p.goles,
        asistencias: p.asistencias,
        atajadas: p.atajadas,
        minutos: p.minutos,
        calificacion: p.calificacion,
        notas: p.notas,
      })),
      disputa: (partido.disputas ?? [])[0]
        ? { id: (partido.disputas ?? [])[0]!.id, estado: (partido.disputas ?? [])[0]!.estado, motivo: (partido.disputas ?? [])[0]!.motivo }
        : null,
    };
  }
}
