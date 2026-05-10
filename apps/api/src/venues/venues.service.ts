import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient } from '@pgd/db';
import { PRISMA_SERVICE } from '../database/database.module.js';
import type { CreateVenueDto } from './dto/create-venue.dto.js';
import type { UpdateVenueDto } from './dto/update-venue.dto.js';
import type { SearchVenuesDto } from './dto/search-venues.dto.js';
import type { BulkCreateSlotsDto } from './dto/bulk-create-slots.dto.js';
import type { CreateFieldDto } from './dto/create-field.dto.js';
import type { JwtPayload } from '../common/decorators/current-user.decorator.js';

type GeoVenueRow = {
  id: string;
  nombre: string;
  ubicacion_name: string | null;
  rating: string;
  owner_id: string | null;
  lat: number | null;
  lng: number | null;
  dist_m: number | null;
};

@Injectable()
export class VenuesService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  async search(dto: SearchVenuesDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;
    const radius = dto.radius ?? 5000;

    // Geo query si se pasan coordenadas
    if (dto.lat !== undefined && dto.lng !== undefined) {
      const ratingFilter = dto.rating_min ?? 0;
      const rows = await this.prisma.$queryRaw<GeoVenueRow[]>`
        SELECT
          c.id,
          c.nombre,
          c.ubicacion_name,
          c.rating,
          c.owner_id,
          ST_Y(c.geom::geometry) AS lat,
          ST_X(c.geom::geometry) AS lng,
          ST_Distance(c.geom, ST_MakePoint(${dto.lng}, ${dto.lat})::geography) AS dist_m
        FROM cancha c
        WHERE c.deleted_at IS NULL
          AND ST_DWithin(c.geom, ST_MakePoint(${dto.lng}, ${dto.lat})::geography, ${radius})
          AND c.rating >= ${ratingFilter}
        ORDER BY dist_m ASC
        LIMIT ${limit} OFFSET ${skip}
      `;

      return {
        items: rows.map((r) => this.serializeVenueGeo(r)),
        page,
        limit,
        total: rows.length,
      };
    }

    // Búsqueda sin coordenadas
    const where = {
      deletedAt: null,
      ...(dto.rating_min !== undefined && { rating: { gte: dto.rating_min } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.cancha.findMany({
        where,
        skip,
        take: limit,
        orderBy: { rating: 'desc' },
        include: { _count: { select: { campos: true } } },
      }),
      this.prisma.cancha.count({ where }),
    ]);

    return {
      items: items.map((c) => this.serializeVenueBasic(c)),
      page,
      limit,
      total,
    };
  }

  async findById(id: string): Promise<Record<string, unknown>> {
    const cancha = await this.prisma.cancha.findFirst({
      where: { id, deletedAt: null },
      include: {
        campos: true,
        resenas: { take: 10, orderBy: { createdAt: 'desc' } },
        _count: { select: { campos: true } },
      },
    });
    if (!cancha) throw new NotFoundException({ error: { code: 'VENUE_NOT_FOUND', message: 'Cancha no encontrada' } });

    // Obtener coordenadas via raw query
    const geoRows = await this.prisma.$queryRaw<{ lat: number; lng: number }[]>`
      SELECT ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lng
      FROM cancha WHERE id = ${id}::uuid AND geom IS NOT NULL
    `;
    const geo = geoRows[0] ?? null;

    return {
      id: cancha.id,
      nombre: cancha.nombre,
      ubicacion_name: cancha.ubicacionName,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      rating: Number(cancha.rating),
      politicas: cancha.politicas,
      owner_id: cancha.ownerId,
      created_at: cancha.createdAt.toISOString(),
      campos: cancha.campos.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        modalidad: f.modalidad,
        precio_base_cents: f.precioBaseCents,
        duracion_min: f.duracionMin,
      })),
      resenas: cancha.resenas.map((r) => ({
        id: r.id,
        puntaje: r.puntaje,
        comentario: r.comentario,
        created_at: r.createdAt.toISOString(),
      })),
    };
  }

  async create(userId: string, dto: CreateVenueDto) {
    // Crear cancha sin geom primero, luego actualizar con PostGIS
    const cancha = await this.prisma.cancha.create({
      data: {
        nombre: dto.nombre,
        ...(dto.ubicacion_name !== undefined && { ubicacionName: dto.ubicacion_name }),
        ...(dto.politicas !== undefined && { politicas: dto.politicas as unknown as object }),
        ownerId: userId,
      },
    });

    await this.prisma.$executeRawUnsafe(
      `UPDATE cancha SET geom = ST_GeogFromText('SRID=4326;POINT(${dto.lng} ${dto.lat})') WHERE id = $1::uuid`,
      cancha.id,
    );

    // Asignar rol cancha_admin con scope de la cancha
    await this.prisma.roleAssignment.upsert({
      where: { usuarioId_rol_scopeId: { usuarioId: userId, rol: 'cancha_admin', scopeId: cancha.id } },
      update: {},
      create: { usuarioId: userId, rol: 'cancha_admin', scopeId: cancha.id },
    });

    return { id: cancha.id, nombre: cancha.nombre, lat: dto.lat, lng: dto.lng };
  }

  async update(id: string, user: JwtPayload, dto: UpdateVenueDto): Promise<Record<string, unknown>> {
    const cancha = await this.prisma.cancha.findFirst({ where: { id, deletedAt: null } });
    if (!cancha) throw new NotFoundException({ error: { code: 'VENUE_NOT_FOUND', message: 'Cancha no encontrada' } });

    const isSuperAdmin = user.roles.some((r) => r.rol === 'super_admin');
    const isOwner = cancha.ownerId === user.sub;
    if (!isSuperAdmin && !isOwner) {
      throw new ForbiddenException({ error: { code: 'FORBIDDEN', message: 'Solo el dueño o un super_admin puede editar esta cancha' } });
    }

    await this.prisma.cancha.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.ubicacion_name !== undefined && { ubicacionName: dto.ubicacion_name }),
        ...(dto.politicas !== undefined && { politicas: dto.politicas as unknown as object }),
      },
    });

    if (dto.lat !== undefined && dto.lng !== undefined) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE cancha SET geom = ST_GeogFromText('SRID=4326;POINT(${dto.lng} ${dto.lat})') WHERE id = $1::uuid`,
        id,
      );
    }

    return this.findById(id);
  }

  async createField(venueId: string, user: JwtPayload, dto: CreateFieldDto): Promise<Record<string, unknown>> {
    const cancha = await this.prisma.cancha.findFirst({ where: { id: venueId, deletedAt: null } });
    if (!cancha) throw new NotFoundException({ error: { code: 'VENUE_NOT_FOUND', message: 'Cancha no encontrada' } });
    this.assertVenueAdmin(cancha.ownerId, user);

    const campo = await this.prisma.campo.create({
      data: {
        canchaId: venueId,
        modalidad: dto.modalidad,
        precioBaseCents: dto.precio_base_cents,
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.duracion_min !== undefined && { duracionMin: dto.duracion_min }),
      },
    });

    return {
      id: campo.id,
      cancha_id: campo.canchaId,
      nombre: campo.nombre,
      modalidad: campo.modalidad,
      precio_base_cents: campo.precioBaseCents,
      duracion_min: campo.duracionMin,
    };
  }

  async getSlots(fieldId: string, from?: string, to?: string): Promise<Array<Record<string, unknown>>> {
    const campo = await this.prisma.campo.findUnique({ where: { id: fieldId } });
    if (!campo) throw new NotFoundException({ error: { code: 'FIELD_NOT_FOUND', message: 'Campo no encontrado' } });

    const slots = await this.prisma.agendaSlot.findMany({
      where: {
        campoId: fieldId,
        ...(from !== undefined && { inicio: { gte: new Date(from) } }),
        ...(to !== undefined && { fin: { lte: new Date(to) } }),
      },
      orderBy: { inicio: 'asc' },
    });

    return slots.map((s) => ({
      id: s.id,
      inicio: s.inicio.toISOString(),
      fin: s.fin.toISOString(),
      estado: s.estado,
      precio_cents: s.precioCents,
    }));
  }

  async bulkCreateSlots(fieldId: string, user: JwtPayload, dto: BulkCreateSlotsDto): Promise<{ count: number }> {
    const campo = await this.prisma.campo.findUnique({
      where: { id: fieldId },
      include: { cancha: true },
    });
    if (!campo) throw new NotFoundException({ error: { code: 'FIELD_NOT_FOUND', message: 'Campo no encontrado' } });
    this.assertVenueAdmin(campo.cancha.ownerId, user);

    const from = new Date(dto.from);
    const to = new Date(dto.to);
    const duracionMs = dto.duracion_min * 60 * 1000;
    const precio = dto.precio_cents ?? campo.precioBaseCents;

    const slots: { campoId: string; inicio: Date; fin: Date; precioCents: number }[] = [];
    let cursor = new Date(from);
    while (cursor < to) {
      const fin = new Date(cursor.getTime() + duracionMs);
      if (fin > to) break;
      slots.push({ campoId: fieldId, inicio: new Date(cursor), fin, precioCents: precio });
      cursor = fin;
    }

    // Crear slots ignorando conflictos (unique constraint campoId+inicio)
    const result = await this.prisma.agendaSlot.createMany({
      data: slots,
      skipDuplicates: true,
    });

    return { count: result.count };
  }

  async blockSlot(slotId: string, user: JwtPayload, motivo?: string): Promise<Record<string, unknown>> {
    const slot = await this.prisma.agendaSlot.findUnique({
      where: { id: slotId },
      include: { campo: { include: { cancha: true } } },
    });
    if (!slot) throw new NotFoundException({ error: { code: 'SLOT_NOT_FOUND', message: 'Slot no encontrado' } });
    this.assertVenueAdmin(slot.campo.cancha.ownerId, user);

    const updated = await this.prisma.agendaSlot.update({
      where: { id: slotId },
      data: { estado: 'bloqueado' },
    });

    return {
      id: updated.id,
      estado: updated.estado,
      inicio: updated.inicio.toISOString(),
      fin: updated.fin.toISOString(),
      motivo: motivo ?? null,
    };
  }

  private assertVenueAdmin(ownerId: string | null, user: JwtPayload) {
    const isSuperAdmin = user.roles.some((r) => r.rol === 'super_admin');
    if (!isSuperAdmin && ownerId !== user.sub) {
      throw new ForbiddenException({ error: { code: 'FORBIDDEN', message: 'Solo el dueño o un super_admin puede realizar esta acción' } });
    }
  }

  private serializeVenueGeo(r: GeoVenueRow) {
    return {
      id: r.id,
      nombre: r.nombre,
      ubicacion_name: r.ubicacion_name,
      rating: Number(r.rating),
      lat: r.lat,
      lng: r.lng,
      dist_m: r.dist_m !== null ? Math.round(r.dist_m) : null,
    };
  }

  private serializeVenueBasic(c: {
    id: string;
    nombre: string;
    ubicacionName: string | null;
    rating: { toNumber: () => number } | number;
    ownerId: string | null;
    _count: { campos: number };
  }) {
    return {
      id: c.id,
      nombre: c.nombre,
      ubicacion_name: c.ubicacionName,
      rating: typeof c.rating === 'number' ? c.rating : c.rating.toNumber(),
      total_campos: c._count.campos,
    };
  }
}
