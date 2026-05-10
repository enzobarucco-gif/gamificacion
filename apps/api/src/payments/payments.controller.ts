import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../common/guards/jwt.guard.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { PaymentsService } from './payments.service.js';
import { InitCheckoutDto } from './dto/init-checkout.dto.js';
import { InitSplitDto } from './dto/init-split.dto.js';

@ApiTags('payments')
@Controller()
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('payments/checkout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Iniciar checkout para una reserva' })
  async initCheckout(@CurrentUser() user: JwtPayload, @Body() dto: InitCheckoutDto) {
    return this.payments.initCheckout(user.sub, dto);
  }

  @Post('payments/split')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Iniciar split de pago entre jugadores' })
  async initSplit(@CurrentUser() user: JwtPayload, @Body() dto: InitSplitDto) {
    return this.payments.initSplit(user.sub, dto);
  }

  @Get('payments/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ver estado de un pago' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.payments.findById(id, user.sub);
  }

  @Public()
  @Post('webhooks/mercado_pago')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook de Mercado Pago (firma HMAC-SHA256)' })
  async mercadoPagoWebhook(@Req() req: RawBodyRequest<FastifyRequest>) {
    const raw = req.rawBody ?? Buffer.from('{}');
    const signature = req.headers['x-signature'] as string | undefined;
    return this.payments.handleMercadoPagoWebhook(raw, signature);
  }

  @Public()
  @Post('webhooks/stripe')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook de Stripe (firma HMAC-SHA256)' })
  async stripeWebhook(@Req() req: RawBodyRequest<FastifyRequest>) {
    const raw = req.rawBody ?? Buffer.from('{}');
    const signature = req.headers['stripe-signature'] as string | undefined;
    return this.payments.handleStripeWebhook(raw, signature);
  }
}
