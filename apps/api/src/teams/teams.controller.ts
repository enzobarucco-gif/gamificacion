import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { TeamsService } from './teams.service.js';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { UpdateTeamDto } from './dto/update-team.dto.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';

@ApiTags('teams')
@Controller('teams')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mis equipos' })
  async getMyTeams(@CurrentUser() user: JwtPayload) {
    return this.teams.getMyTeams(user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Crear equipo' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTeamDto) {
    return this.teams.create(user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de equipo' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.teams.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar equipo (capitán)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teams.update(id, user.sub, dto);
  }

  @Post(':id/invite')
  @HttpCode(200)
  @ApiOperation({ summary: 'Invitar jugador al equipo (capitán)' })
  async invite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: InviteMemberDto,
  ) {
    await this.teams.invite(id, user.sub, dto.jugador_id);
    return { status: 'invited' };
  }

  @Post(':id/join')
  @HttpCode(200)
  @ApiOperation({ summary: 'Solicitar unirse al equipo' })
  async join(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    await this.teams.join(id, user.sub);
    return { status: 'pending' };
  }

  @Patch(':id/members/:jid')
  @ApiOperation({ summary: 'Cambiar rol/estado de miembro (capitán)' })
  async updateMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('jid', ParseUUIDPipe) jid: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.teams.updateMember(id, user.sub, jid, dto);
  }

  @Delete(':id/members/:jid')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover miembro del equipo (capitán)' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('jid', ParseUUIDPipe) jid: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.teams.removeMember(id, user.sub, jid);
  }
}
