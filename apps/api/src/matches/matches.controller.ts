import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { MatchesService } from './matches.service.js';
import { CreateMatchDto } from './dto/create-match.dto.js';
import { LoadStatsDto } from './dto/load-stats.dto.js';
import { ValidateMatchDto } from './dto/validate-match.dto.js';
import { OpenDisputeDto } from './dto/open-dispute.dto.js';
import { CloseDisputeDto } from './dto/close-dispute.dto.js';

@ApiTags('matches')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Post('matches')
  @ApiOperation({ summary: 'Crear partido' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMatchDto) {
    return this.matches.create(user.sub, dto);
  }

  @Get('matches/me')
  @ApiOperation({ summary: 'Mis partidos' })
  async findMyMatches(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('estado') estado?: string,
  ) {
    return this.matches.findMyMatches(user.sub, {
      ...(from !== undefined && { from }),
      ...(to !== undefined && { to }),
      ...(estado !== undefined && { estado }),
    });
  }

  @Get('matches/:id')
  @ApiOperation({ summary: 'Ver partido con equipos y stats' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.matches.findById(id);
  }

  @Post('matches/:id/stats')
  @ApiOperation({ summary: 'Cargar stats del equipo (capitán)' })
  async loadStats(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: LoadStatsDto,
  ) {
    return this.matches.loadStats(id, user, dto);
  }

  @Post('matches/:id/validate')
  @ApiOperation({ summary: 'Validar resultado del partido (capitán)' })
  async validate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ValidateMatchDto,
  ) {
    return this.matches.validate(id, user, dto);
  }

  @Post('matches/:id/disputes')
  @ApiOperation({ summary: 'Abrir disputa sobre el partido' })
  async openDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: OpenDisputeDto,
  ) {
    return this.matches.openDispute(id, user.sub, dto);
  }

  @Patch('disputes/:id/close')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Cerrar disputa con resolución (super_admin)' })
  async closeDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CloseDisputeDto,
  ) {
    return this.matches.closeDispute(id, user.sub, dto.resolucion);
  }
}
