import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient } from '@pgd/db';
import { PRISMA_SERVICE } from '../database/database.module.js';
import type { JwtPayload } from '../common/decorators/current-user.decorator.js';

@Injectable()
export class DashboardService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient) {}

  async getKpis(venueId: string, user: JwtPayload, from: Date, to: Date): Promise<Record<string, unknown>> {
    const cancha = await this.assertVenueAdmin(venueId, user);

    const [totalSlots, reservadosSlots, pagosAprobados, proximasReservas, resenas] = await Promise.all([
      // Total slots en período
      this.prisma.agendaSlot.count({
        where: { campo: { canchaId: venueId }, inicio: { gte: from, lte: to } },
      }),

      // Slots reservados (pagados o pendientes)
      this.prisma.agendaSlot.count({
        where: {
          campo: { canchaId: venueId },
          inicio: { gte: from, lte: to },
          estado: { in: ['reservado', 'bloqueado'] },
        },
      }),

      // Ingresos: pagos aprobados en el período
      this.prisma.pago.findMany({
        where: {
          estado: 'aprobado',
          reserva: { canchaId: venueId },
          updatedAt: { gte: from, lte: to },
        },
        select: { montoCents: true, moneda: true },
      }),

      // Próximas 10 reservas
      this.prisma.reserva.findMany({
        where: {
          canchaId: venueId,
          estado: { in: ['pendiente', 'pagada'] },
          slot: { inicio: { gte: new Date() } },
        },
        include: {
          slot: { include: { campo: { select: { nombre: true, modalidad: true } } } },
          pagos: { where: { estado: 'aprobado' }, select: { montoCents: true } },
        },
        orderBy: { slot: { inicio: 'asc' } },
        take: 10,
      }),

      // Rating promedio (NPS adaptado a escala 1-5)
      this.prisma.resena.aggregate({
        where: { tipoObjeto: 'cancha', objetoId: venueId },
        _avg: { puntaje: true },
        _count: { puntaje: true },
      }),
    ]);

    const ingresosTotalCents = pagosAprobados.reduce((sum, p) => sum + p.montoCents, 0);
    const ocupacionPct = totalSlots > 0 ? Math.round((reservadosSlots / totalSlots) * 100) : 0;

    const ratingPromedio = resenas._avg.puntaje !== null ? Math.round(resenas._avg.puntaje * 100) / 100 : null;
    const totalResenas = resenas._count.puntaje;

    return {
      cancha_id: venueId,
      cancha_nombre: cancha.nombre,
      periodo: { from: from.toISOString(), to: to.toISOString() },
      ocupacion: {
        total_slots: totalSlots,
        slots_ocupados: reservadosSlots,
        pct: ocupacionPct,
      },
      ingresos: {
        total_cents: ingresosTotalCents,
        total_ars: (ingresosTotalCents / 100).toFixed(2),
        cantidad_pagos: pagosAprobados.length,
      },
      rating: {
        promedio: ratingPromedio,
        total_resenas: totalResenas,
      },
      proximas_reservas: proximasReservas.map((r) => ({
        id: r.id,
        estado: r.estado,
        inicio: r.slot?.inicio.toISOString() ?? null,
        campo: r.slot?.campo.nombre ?? null,
        modalidad: r.slot?.campo.modalidad ?? null,
        importe_cents: r.importeCents,
        pagado: r.pagos.length > 0,
      })),
    };
  }

  async exportBookings(venueId: string, user: JwtPayload, from: Date, to: Date, format: 'csv' | 'xlsx'): Promise<{ content: string; filename: string; mimeType: string }> {
    await this.assertVenueAdmin(venueId, user);

    const reservas = await this.prisma.reserva.findMany({
      where: {
        canchaId: venueId,
        createdAt: { gte: from, lte: to },
      },
      include: {
        slot: { include: { campo: { select: { nombre: true, modalidad: true } } } },
        pagos: { where: { estado: 'aprobado' }, select: { montoCents: true, proveedor: true, pagadorId: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const rows = reservas.map((r) => ({
      id: r.id,
      estado: r.estado,
      campo: r.slot?.campo.nombre ?? '',
      modalidad: r.slot?.campo.modalidad ?? '',
      inicio: r.slot?.inicio.toISOString() ?? '',
      fin: r.slot?.fin.toISOString() ?? '',
      importe_cents: r.importeCents,
      sena_cents: r.senaCents,
      pago_aprobado: r.pagos.length > 0 ? 'si' : 'no',
      proveedor: r.pagos[0]?.proveedor ?? '',
      created_at: r.createdAt.toISOString(),
    }));

    const fromStr = from.toISOString().split('T')[0]!;
    const toStr = to.toISOString().split('T')[0]!;
    const filename = `reservas_${venueId}_${fromStr}_${toStr}.${format}`;

    if (format === 'csv') {
      return { content: toCsv(rows), filename, mimeType: 'text/csv; charset=utf-8' };
    }
    // XLSX: devuelve CSV con mime xlsx hasta integrar exceljs
    return { content: toCsv(rows), filename: filename.replace('.xlsx', '.csv'), mimeType: 'text/csv; charset=utf-8' };
  }

  async exportRevenue(venueId: string, user: JwtPayload, from: Date, to: Date, format: 'csv' | 'xlsx'): Promise<{ content: string; filename: string; mimeType: string }> {
    await this.assertVenueAdmin(venueId, user);

    const pagos = await this.prisma.pago.findMany({
      where: {
        estado: 'aprobado',
        reserva: { canchaId: venueId },
        updatedAt: { gte: from, lte: to },
      },
      include: {
        reserva: {
          include: { slot: { include: { campo: { select: { nombre: true, modalidad: true } } } } },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });

    const rows = pagos.map((p) => ({
      pago_id: p.id,
      proveedor: p.proveedor,
      estado: p.estado,
      monto_cents: p.montoCents,
      monto_ars: (p.montoCents / 100).toFixed(2),
      moneda: p.moneda,
      campo: p.reserva.slot?.campo.nombre ?? '',
      modalidad: p.reserva.slot?.campo.modalidad ?? '',
      inicio_slot: p.reserva.slot?.inicio.toISOString() ?? '',
      fecha_pago: p.updatedAt.toISOString(),
    }));

    const fromStr = from.toISOString().split('T')[0]!;
    const toStr = to.toISOString().split('T')[0]!;
    const filename = `ingresos_${venueId}_${fromStr}_${toStr}.${format === 'csv' ? 'csv' : 'csv'}`;

    return { content: toCsv(rows), filename, mimeType: 'text/csv; charset=utf-8' };
  }

  private async assertVenueAdmin(venueId: string, user: JwtPayload) {
    const cancha = await this.prisma.cancha.findFirst({ where: { id: venueId, deletedAt: null } });
    if (!cancha) throw new NotFoundException({ error: { code: 'VENUE_NOT_FOUND', message: 'Cancha no encontrada' } });

    const isSuperAdmin = user.roles.some((r) => r.rol === 'super_admin');
    const isOwner = cancha.ownerId === user.sub;
    if (!isSuperAdmin && !isOwner) {
      throw new ForbiddenException({ error: { code: 'FORBIDDEN', message: 'Solo el dueño o un super_admin puede ver el dashboard' } });
    }
    return cancha;
  }
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ];
  return lines.join('\r\n');
}
