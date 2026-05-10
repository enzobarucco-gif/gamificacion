import { Module } from '@nestjs/common';
import { VenuesService } from './venues.service.js';
import { VenuesController } from './venues.controller.js';

@Module({
  controllers: [VenuesController],
  providers: [VenuesService],
})
export class VenuesModule {}
