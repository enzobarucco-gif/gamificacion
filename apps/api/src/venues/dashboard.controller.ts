import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { JwtAuthGuard } from '../common/guards/jwt.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { DashboardService } from './dashboard.service.js';

function parseDate(s: string | undefined, fallback: Date): Date {
  if (!s) return fallback;
  const d = new Date(s);
  return isNaN(d.getTime()) ? fallback : d;
}

@ApiTags('venues-dashboard')
@Controller('venues')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'KPIs de la cancha (ocupación, ingresos, NPS, próximas reservas)' })
  @ApiQuery({ name: 'from', required: false, description: 'Inicio período ISO 8601' })
  @ApiQuery({ name: 'to', required: false, description: 'Fin período ISO 8601' })
  async getKpis(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1); // inicio del mes
    return this.dashboard.getKpis(
      id,
      user,
      parseDate(from, defaultFrom),
      parseDate(to, now),
    );
  }

  @Get(':id/reports/bookings')
  @ApiOperation({ summary: 'Exportar reservas en CSV' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'xlsx'] })
  async exportBookings(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Res() reply: FastifyReply,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
  ) {
    const now = new Date();
    const fmt = format === 'xlsx' ? 'xlsx' : 'csv';
    const result = await this.dashboard.exportBookings(
      id,
      user,
      parseDate(from, new Date(now.getFullYear(), now.getMonth(), 1)),
      parseDate(to, now),
      fmt,
    );
    void reply
      .header('Content-Type', result.mimeType)
      .header('Content-Disposition', `attachment; filename="${result.filename}"`)
      .send(result.content);
  }

  @Get(':id/reports/revenue')
  @ApiOperation({ summary: 'Exportar ingresos en CSV' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'xlsx'] })
  async exportRevenue(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Res() reply: FastifyReply,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format?: string,
  ) {
    const now = new Date();
    const fmt = format === 'xlsx' ? 'xlsx' : 'csv';
    const result = await this.dashboard.exportRevenue(
      id,
      user,
      parseDate(from, new Date(now.getFullYear(), now.getMonth(), 1)),
      parseDate(to, now),
      fmt,
    );
    void reply
      .header('Content-Type', result.mimeType)
      .header('Content-Disposition', `attachment; filename="${result.filename}"`)
      .send(result.content);
  }
}
