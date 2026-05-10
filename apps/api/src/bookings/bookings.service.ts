import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaClient } from '@pgd/db';
import { Queue } from 'bullmq';
import { PRISMA_SERVICE } from '../database/database.module.js';
import { BOOKING_EXPIRY_QUEUE } from '../queue/queue.module.js';
import type { BookingExpiryJob } from '../queue/booking-expiry.processor.js';
import type { CreateBookingDto } from './dto/create-booking.dto.js';

const EXPIRY_MS = 15 * 60 * 1000; // 15 minutos

type SlotRow = { id: string; campo_id: string; estado: string; precio_cents: number | null; version: number };

@Injectable()
export class BookingsService {
  constructor(
    @Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient,
    @Inject(BOOKING_EXPIRY_QUEUE) private readonly expiryQueue: Queue<BookingExpiryJob>,
  ) {}

  async create(userId: string, dto: CreateBookingDto): Promise<Record<string, unknown>> {
    const proveedor = dto.proveedor ?? 'mercado_pago';

    // Verificar que el slot existe
    const slot = await this.prisma.agendaSlot.findUnique({
      where: { id: dto.slot_id },
      include: { campo: { include: { cancha: { select: { id: true } } } } },
    });
    if (!slot) throw new NotFoundException({ error: { code: 'SLOT_NOT_FOUND', message: 'Slot no encontrado' } });

    // Reserva atómica con optimistic locking vía UPDATE ... WHERE version = :v
    const locked = await this.prisma.$executeRaw`
      UPDATE agenda_slot
      SET estado = 'reservado', version = version + 1
      WHERE id = ${dto.slot_id}::uuid
        AND estado = 'libre'
        AND version = ${slot.version}
    `;

    if (locked === 0) {
      throw new ConflictException({ error: { code: 'SLOT_NOT_AVAILABLE', message: 'El slot ya fue reservado por otro usuario' } });
    }

    const importeCents = slot.precioCents ?? slot.campo.precioBaseCents;
    const senaCents = dto.sena_cents ?? importeCents;
    const expiresAt = new Date(Date.now() + EXPIRY_MS);

    // Crear reserva y pago en una transacción
    const { reserva, pago } = await this.prisma.$transaction(async (tx) => {
      const reserva = await tx.reserva.create({
        data: {
          slotId: dto.slot_id,
          canchaId: slot.campo.cancha.id,
          ...(dto.partido_id !== undefined && { partidoId: dto.partido_id }),
          estado: 'pendiente',
          importeCents,
          senaCents,
          expiresAt,
        },
      });

      const extPaymentId = crypto.randomUUID();
      const pago = await tx.pago.create({
        data: {
          reservaId: reserva.id,
          proveedor,
          extPaymentId,
          estado: 'iniciado',
          montoCents: senaCents,
          pagadorId: userId,
        },
      });

      return { reserva, pago };
    });

    // Encolar job de expiración con delay
    await this.expiryQueue.add(
      'expire',
      { reservaId: reserva.id, slotId: dto.slot_id },
      { delay: EXPIRY_MS, jobId: `expire-${reserva.id}` },
    );

    const checkoutUrl = this.buildCheckoutUrl(proveedor, pago.extPaymentId!);

    return {
      reserva: {
        id: reserva.id,
        slot_id: reserva.slotId,
        estado: reserva.estado,
        importe_cents: reserva.importeCents,
        sena_cents: reserva.senaCents,
        expires_at: reserva.expiresAt?.toISOString(),
        created_at: reserva.createdAt.toISOString(),
      },
      pago: {
        id: pago.id,
        proveedor: pago.proveedor,
        ext_payment_id: pago.extPaymentId,
        estado: pago.estado,
        monto_cents: pago.montoCents,
      },
      checkout_url: checkoutUrl,
    };
  }

  async findById(reservaId: string, userId: string): Promise<Record<string, unknown>> {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id: reservaId },
      include: { pagos: true, slot: true },
    });
    if (!reserva) throw new NotFoundException({ error: { code: 'BOOKING_NOT_FOUND', message: 'Reserva no encontrada' } });

    // Solo el pagador o super_admin puede ver la reserva
    const isPagador = reserva.pagos.some((p) => p.pagadorId === userId);
    if (!isPagador) {
      throw new ForbiddenException({ error: { code: 'FORBIDDEN', message: 'No tenés acceso a esta reserva' } });
    }

    return this.serialize(reserva);
  }

  async findMyBookings(userId: string): Promise<Array<Record<string, unknown>>> {
    const reservas = await this.prisma.reserva.findMany({
      where: { pagos: { some: { pagadorId: userId } } },
      include: { pagos: true, slot: true },
      orderBy: { createdAt: 'desc' },
    });
    return reservas.map((r) => this.serialize(r));
  }

  async cancel(reservaId: string, userId: string): Promise<Record<string, unknown>> {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id: reservaId },
      include: { pagos: true },
    });
    if (!reserva) throw new NotFoundException({ error: { code: 'BOOKING_NOT_FOUND', message: 'Reserva no encontrada' } });

    const isPagador = reserva.pagos.some((p) => p.pagadorId === userId);
    if (!isPagador) {
      throw new ForbiddenException({ error: { code: 'FORBIDDEN', message: 'No tenés acceso a esta reserva' } });
    }

    if (reserva.estado !== 'pendiente' && reserva.estado !== 'pagada') {
      throw new ConflictException({ error: { code: 'CANNOT_CANCEL', message: 'La reserva no puede cancelarse en su estado actual' } });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.reserva.update({ where: { id: reservaId }, data: { estado: 'cancelada' } });
      if (reserva.slotId) {
        await tx.agendaSlot.update({
          where: { id: reserva.slotId },
          data: { estado: 'libre', version: { increment: 1 } },
        });
      }
    });

    return { id: reserva.id, estado: 'cancelada' };
  }

  private serialize(reserva: {
    id: string;
    slotId: string | null;
    canchaId: string | null;
    estado: string;
    importeCents: number;
    senaCents: number;
    expiresAt: Date | null;
    createdAt: Date;
    pagos: Array<{ id: string; proveedor: string; estado: string; montoCents: number; extPaymentId: string | null }>;
  }): Record<string, unknown> {
    return {
      id: reserva.id,
      slot_id: reserva.slotId,
      cancha_id: reserva.canchaId,
      estado: reserva.estado,
      importe_cents: reserva.importeCents,
      sena_cents: reserva.senaCents,
      expires_at: reserva.expiresAt?.toISOString() ?? null,
      created_at: reserva.createdAt.toISOString(),
      pagos: reserva.pagos.map((p) => ({
        id: p.id,
        proveedor: p.proveedor,
        estado: p.estado,
        monto_cents: p.montoCents,
        ext_payment_id: p.extPaymentId,
      })),
    };
  }

  private buildCheckoutUrl(proveedor: string, extPaymentId: string): string {
    if (proveedor === 'stripe') {
      return `https://checkout.stripe.com/pay/${extPaymentId}`;
    }
    return `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${extPaymentId}`;
  }
}
