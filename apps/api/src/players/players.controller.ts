import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlayersService } from './players.service.js';
import { UpdatePlayerDto } from './dto/update-player.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';

@ApiTags('players')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('players')
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Get('search')
  @ApiOperation({ summary: 'Buscar jugadores' })
  async search(
    @Query('q') q?: string,
    @Query('posicion') posicion?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.players.search({ ...(q !== undefined && { q }), ...(posicion !== undefined && { posicion }), page: Number(page), limit: Number(limit) });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver perfil de jugador' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.players.findById(id, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar perfil de jugador (solo el propio)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePlayerDto,
  ) {
    return this.players.update(id, user.sub, dto);
  }
}
