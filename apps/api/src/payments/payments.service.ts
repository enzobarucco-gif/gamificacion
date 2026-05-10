import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PrismaClient } from '@pgd/db';
import { createHmac } from 'crypto';
import { PRISMA_SERVICE } from '../database/database.module.js';
import type { InitCheckoutDto } from './dto/init-checkout.dto.js';
import type { InitSplitDto } from './dto/init-split.dto.js';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient,
    private readonly config: ConfigService,
  ) {}

  async initCheckout(userId: string, dto: InitCheckoutDto): Promise<Record<string, unknown>> {
    const reserva = await this.assertReservaAccess(dto.reserva_id, userId);

    const extPaymentId = crypto.randomUUID();
    const pago = await this.prisma.pago.create({
      data: {
        reservaId: reserva.id,
        proveedor: dto.proveedor,
        extPaymentId,
        estado: 'iniciado',
        montoCents: reserva.senaCents || reserva.importeCents,
        pagadorId: userId,
      },
    });

    return {
      checkout_url: this.buildCheckoutUrl(dto.proveedor, extPaymentId),
      ext_payment_id: extPaymentId,
      pago_id: pago.id,
    };
  }

  async initSplit(userId: string, dto: InitSplitDto): Promise<{ checkouts: Array<Record<string, unknown>> }> {
    const reserva = await this.assertReservaAccess(dto.reserva_id, userId);

    const totalSplit = dto.splits.reduce((acc, s) => acc + s.monto_cents, 0);
    if (totalSplit > reserva.importeCents) {
      throw new BadRequestException({ error: { code: 'SPLIT_EXCEEDS_TOTAL', message: 'El split supera el importe de la reserva' } });
    }

    const checkouts = await Promise.all(
      dto.splits.map(async (split) => {
        const extPaymentId = crypto.randomUUID();
        const pago = await this.prisma.pago.create({
          data: {
            reservaId: reserva.id,
            proveedor: dto.proveedor,
            extPaymentId,
            estado: 'iniciado',
            montoCents: split.monto_cents,
            pagadorId: split.usuario_id,
            splitJson: dto.splits as unknown as object,
          },
        });
        return {
          usuario_id: split.usuario_id,
          pago_id: pago.id,
          ext_payment_id: extPaymentId,
          monto_cents: split.monto_cents,
          checkout_url: this.buildCheckoutUrl(dto.proveedor, extPaymentId),
        };
      }),
    );

    return { checkouts };
  }

  async findById(pagoId: string, userId: string): Promise<Record<string, unknown>> {
    const pago = await this.prisma.pago.findUnique({ where: { id: pagoId } });
    if (!pago) throw new NotFoundException({ error: { code: 'PAYMENT_NOT_FOUND', message: 'Pago no encontrado' } });
    if (pago.pagadorId !== userId) {
      throw new ForbiddenException({ error: { code: 'FORBIDDEN', message: 'No tenés acceso a este pago' } });
    }
    return {
      id: pago.id,
      reserva_id: pago.reservaId,
      proveedor: pago.proveedor,
      estado: pago.estado,
      monto_cents: pago.montoCents,
      ext_payment_id: pago.extPaymentId,
      created_at: pago.createdAt.toISOString(),
    };
  }

  async handleMercadoPagoWebhook(
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<{ ok: boolean }> {
    this.verifyMpSignature(rawBody, signature);

    const payload = JSON.parse(rawBody.toString()) as { data?: { id?: string }; action?: string };
    const extPaymentId = payload.data?.id;
    if (!extPaymentId) return { ok: true };

    // Solo procesamos notificaciones de pago aprobado
    if (payload.action === 'payment.created' || payload.action === 'payment.updated') {
      await this.confirmPayment(extPaymentId);
    }

    return { ok: true };
  }

  async handleStripeWebhook(
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<{ ok: boolean }> {
    this.verifyStripeSignature(rawBody, signature);

    const event = JSON.parse(rawBody.toString()) as { type?: string; data?: { object?: { id?: string } } };
    if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
      const extPaymentId = event.data?.object?.id;
      if (extPaymentId) await this.confirmPayment(extPaymentId);
    }

    return { ok: true };
  }

  private async confirmPayment(extPaymentId: string): Promise<void> {
    const pago = await this.prisma.pago.findUnique({
      where: { extPaymentId },
      include: { reserva: { include: { slot: true } } },
    });
    if (!pago || pago.estado !== 'iniciado') return; // idempotencia

    await this.prisma.$transaction(async (tx) => {
      await tx.pago.update({ where: { id: pago.id }, data: { estado: 'aprobado' } });
      await tx.reserva.update({ where: { id: pago.reservaId }, data: { estado: 'pagada' } });

      // El slot ya fue marcado 'reservado' en el lock inicial; se mantiene
      if (pago.reserva.slot && pago.reserva.slot.estado !== 'reservado') {
        await tx.agendaSlot.update({
          where: { id: pago.reserva.slot.id },
          data: { estado: 'reservado' },
        });
      }
    });
  }

  private verifyMpSignature(rawBody: Buffer, signature: string | undefined): void {
    const secret = this.config.get<string>('MP_WEBHOOK_SECRET');
    if (!secret) return; // skip en dev si no hay secret configurado

    if (!signature) {
      throw new BadRequestException({ error: { code: 'INVALID_SIGNATURE', message: 'Firma de webhook faltante' } });
    }
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!this.timingSafeEqual(expected, signature)) {
      throw new BadRequestException({ error: { code: 'INVALID_SIGNATURE', message: 'Firma de webhook inválida' } });
    }
  }

  private verifyStripeSignature(rawBody: Buffer, signature: string | undefined): void {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) return; // skip en dev si no hay secret configurado

    if (!signature) {
      throw new BadRequestException({ error: { code: 'INVALID_SIGNATURE', message: 'Firma de webhook faltante' } });
    }
    // Stripe usa "t=timestamp,v1=hmac" en el header
    const parts = signature.split(',');
    const tPart = parts.find((p) => p.startsWith('t='));
    const v1Part = parts.find((p) => p.startsWith('v1='));
    if (!tPart || !v1Part) {
      throw new BadRequestException({ error: { code: 'INVALID_SIGNATURE', message: 'Formato de firma inválido' } });
    }
    const timestamp = tPart.slice(2);
    const hmacPayload = `${timestamp}.${rawBody.toString()}`;
    const expected = createHmac('sha256', secret).update(hmacPayload).digest('hex');
    if (!this.timingSafeEqual(expected, v1Part.slice(3))) {
      throw new BadRequestException({ error: { code: 'INVALID_SIGNATURE', message: 'Firma de webhook inválida' } });
    }
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }

  private buildCheckoutUrl(proveedor: string, extPaymentId: string): string {
    if (proveedor === 'stripe') {
      return `https://checkout.stripe.com/pay/${extPaymentId}`;
    }
    return `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${extPaymentId}`;
  }

  private async assertReservaAccess(reservaId: string, userId: string) {
    const reserva = await this.prisma.reserva.findUnique({
      where: { id: reservaId },
      include: { pagos: true },
    });
    if (!reserva) {
      throw new NotFoundException({ error: { code: 'BOOKING_NOT_FOUND', message: 'Reserva no encontrada' } });
    }
    if (reserva.estado !== 'pendiente') {
      throw new ConflictException({ error: { code: 'BOOKING_NOT_PENDING', message: 'La reserva no está pendiente de pago' } });
    }
    return reserva;
  }
}
