import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { BookingExpiryProcessor } from './booking-expiry.processor.js';

export const BOOKING_EXPIRY_QUEUE = 'BOOKING_EXPIRY_QUEUE';

function redisConnection(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    ...(url.password ? { password: url.password } : {}),
  };
}

@Global()
@Module({
  providers: [
    {
      provide: BOOKING_EXPIRY_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Queue('booking-expiry', {
          connection: redisConnection(config.getOrThrow<string>('REDIS_URL')),
          defaultJobOptions: { removeOnComplete: true, removeOnFail: 100 },
        }),
    },
    BookingExpiryProcessor,
  ],
  exports: [BOOKING_EXPIRY_QUEUE],
})
export class QueueModule {}
