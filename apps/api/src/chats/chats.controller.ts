import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt.guard.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { ChatsService } from './chats.service.js';
import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

class SendMessageDto {
  @IsString()
  texto!: string;
}

@ApiTags('chats')
@Controller('chats')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatsController {
  constructor(private readonly chats: ChatsService) {}

  @Get(':scope_tipo/:scope_id')
  @ApiOperation({ summary: 'Ver mensajes de un chat (equipo o partido)' })
  async getMessages(
    @Param('scope_tipo') scopeTipo: string,
    @Param('scope_id', ParseUUIDPipe) scopeId: string,
    @CurrentUser() user: JwtPayload,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chats.getMessages(scopeTipo, scopeId, user.sub, {
      ...(before !== undefined && { before }),
      ...(limit !== undefined && { limit: parseInt(limit, 10) }),
    });
  }

  @Post(':scope_tipo/:scope_id')
  @HttpCode(201)
  @ApiOperation({ summary: 'Enviar mensaje en un chat' })
  async sendMessage(
    @Param('scope_tipo') scopeTipo: string,
    @Param('scope_id', ParseUUIDPipe) scopeId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendMessageDto,
  ) {
    return this.chats.sendMessage(scopeTipo, scopeId, user.sub, dto.texto);
  }
}
