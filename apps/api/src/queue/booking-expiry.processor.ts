import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import type { PrismaClient } from '@pgd/db';
import { PRISMA_SERVICE } from '../database/database.module.js';

export interface BookingExpiryJob {
  reservaId: string;
  slotId: string;
}

@Injectable()
export class BookingExpiryProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingExpiryProcessor.name);
  private worker!: Worker<BookingExpiryJob>;

  constructor(
    private readonly config: ConfigService,
    @Inject(PRISMA_SERVICE) private readonly prisma: PrismaClient,
  ) {}

  onModuleInit() {
    const redisUrl = this.config.getOrThrow<string>('REDIS_URL');
    const url = new URL(redisUrl);
    const connection = {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      ...(url.password ? { password: url.password } : {}),
    };

    this.worker = new Worker<BookingExpiryJob>(
      'booking-expiry',
      async (job) => {
        const { reservaId, slotId } = job.data;
        await this.expireBooking(reservaId, slotId);
      },
      { connection, concurrency: 5 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Expiry job failed reserva=${job?.data.reservaId}: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker.close();
  }

  private async expireBooking(reservaId: string, slotId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const reserva = await tx.reserva.findFirst({
        where: { id: reservaId, estado: 'pendiente' },
      });
      if (!reserva) return; // ya fue pagada o cancelada

      await tx.reserva.update({ where: { id: reservaId }, data: { estado: 'cancelada' } });
      await tx.agendaSlot.update({ where: { id: slotId }, data: { estado: 'libre', version: { increment: 1 } } });
      this.logger.log(`Reserva ${reservaId} expirada, slot ${slotId} liberado`);
    });
  }
}
