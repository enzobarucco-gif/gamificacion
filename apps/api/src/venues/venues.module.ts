import { Module } from '@nestjs/common';
import { VenuesService } from './venues.service.js';
import { VenuesController } from './venues.controller.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardController } from './dashboard.controller.js';

@Module({
  controllers: [VenuesController, DashboardController],
  providers: [VenuesService, DashboardService],
})
export class VenuesModule {}
