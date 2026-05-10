import { ConflictException, NotFoundException } from '@nestjs/common';
import { BookingsService } from '../bookings.service.js';
import { PRISMA_SERVICE } from '../../database/database.module.js';
import { BOOKING_EXPIRY_QUEUE } from '../../queue/queue.module.js';

const mockSlot = {
  id: 'slot-uuid',
  estado: 'libre',
  version: 0,
  precioCents: 5000,
  campo: { precioBaseCents: 5000, cancha: { id: 'cancha-uuid' } },
};

const mockReserva = {
  id: 'reserva-uuid',
  slotId: 'slot-uuid',
  estado: 'pendiente',
  importeCents: 5000,
  senaCents: 5000,
  expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  createdAt: new Date(),
};

const mockPago = {
  id: 'pago-uuid',
  proveedor: 'mercado_pago',
  extPaymentId: 'ext-uuid',
  estado: 'iniciado',
  montoCents: 5000,
};

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    agendaSlot: { findUnique: jest.fn().mockResolvedValue(mockSlot) },
    $executeRaw: jest.fn().mockResolvedValue(1),
    $transaction: jest.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        reserva: { create: jest.fn().mockResolvedValue(mockReserva) },
        pago: { create: jest.fn().mockResolvedValue(mockPago) },
        agendaSlot: { update: jest.fn() },
      }),
    ),
    reserva: {
      findUnique: jest.fn().mockResolvedValue({
        ...mockReserva,
        pagos: [{ id: 'p1', pagadorId: 'user-uuid', proveedor: 'mercado_pago', extPaymentId: 'x', estado: 'iniciado', montoCents: 5000 }],
        slot: mockSlot,
      }),
    },
    ...overrides,
  };
}

function makeQueue() {
  return { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
}

function makeService(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = makePrisma(prismaOverrides);
  const queue = makeQueue();
  const service = new BookingsService(
    prisma as unknown as import('@pgd/db').PrismaClient,
    queue as unknown as import('bullmq').Queue,
  );
  return { service, prisma, queue };
}

describe('BookingsService', () => {
  describe('create()', () => {
    it('crea reserva y encola job cuando el slot está libre', async () => {
      const { service, prisma, queue } = makeService();

      const result = await service.create('user-uuid', { slot_id: 'slot-uuid', proveedor: 'mercado_pago' });

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(queue.add).toHaveBeenCalledWith(
        'expire',
        expect.objectContaining({ reservaId: mockReserva.id }),
        expect.objectContaining({ jobId: `expire-${mockReserva.id}` }),
      );
      expect(result).toMatchObject({ checkout_url: expect.stringContaining('mercadopago') });
    });

    it('lanza ConflictException cuando el optimistic lock falla (0 rows updated)', async () => {
      const { service } = makeService({ $executeRaw: jest.fn().mockResolvedValue(0) });

      await expect(service.create('user-uuid', { slot_id: 'slot-uuid', proveedor: 'mercado_pago' }))
        .rejects.toBeInstanceOf(ConflictException);
    });

    it('lanza NotFoundException cuando el slot no existe', async () => {
      const { service } = makeService({
        agendaSlot: { findUnique: jest.fn().mockResolvedValue(null) },
      });

      await expect(service.create('user-uuid', { slot_id: 'nonexistent', proveedor: 'mercado_pago' }))
        .rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findById()', () => {
    it('devuelve la reserva con pagos al dueño', async () => {
      const { service } = makeService();

      const result = await service.findById('reserva-uuid', 'user-uuid');

      expect(result).toMatchObject({
        id: 'reserva-uuid',
        estado: 'pendiente',
        pagos: expect.arrayContaining([expect.objectContaining({ estado: 'iniciado' })]),
      });
    });

    it('lanza NotFoundException si la reserva no existe', async () => {
      const { service } = makeService({
        reserva: { findUnique: jest.fn().mockResolvedValue(null) },
      });

      await expect(service.findById('nonexistent', 'user-uuid'))
        .rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
