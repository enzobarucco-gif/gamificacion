import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt.guard.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { VenuesService } from './venues.service.js';
import { CreateVenueDto } from './dto/create-venue.dto.js';
import { UpdateVenueDto } from './dto/update-venue.dto.js';
import { SearchVenuesDto } from './dto/search-venues.dto.js';
import { BulkCreateSlotsDto } from './dto/bulk-create-slots.dto.js';
import { CreateFieldDto } from './dto/create-field.dto.js';

@ApiTags('venues')
@Controller()
@UseGuards(JwtAuthGuard)
export class VenuesController {
  constructor(private readonly venues: VenuesService) {}

  @Public()
  @Get('venues')
  @ApiOperation({ summary: 'Buscar canchas (con filtros opcionales y geo)' })
  async search(@Query() dto: SearchVenuesDto) {
    return this.venues.search(dto);
  }

  @Public()
  @Get('venues/:id')
  @ApiOperation({ summary: 'Detalle de cancha' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.venues.findById(id);
  }

  @Post('venues')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear cancha (cancha_admin / super_admin)' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateVenueDto) {
    return this.venues.create(user.sub, dto);
  }

  @Patch('venues/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar cancha (owner o super_admin)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateVenueDto,
  ) {
    return this.venues.update(id, user, dto);
  }

  @Post('venues/:id/fields')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar campo a cancha (owner o super_admin)' })
  async createField(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFieldDto,
  ) {
    return this.venues.createField(id, user, dto);
  }

  @Public()
  @Get('fields/:id/slots')
  @ApiOperation({ summary: 'Ver slots de un campo' })
  async getSlots(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.venues.getSlots(id, from, to);
  }

  @Post('fields/:id/slots/bulk')
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Crear slots en lote (owner o super_admin)' })
  async bulkCreateSlots(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: BulkCreateSlotsDto,
  ) {
    return this.venues.bulkCreateSlots(id, user, dto);
  }

  @Patch('slots/:id/block')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bloquear slot (owner o super_admin)' })
  async blockSlot(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body('motivo') motivo?: string,
  ) {
    return this.venues.blockSlot(id, user, motivo);
  }
}
