import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt.guard.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser, type JwtPayload } from '../common/decorators/current-user.decorator.js';
import { ReviewsService } from './reviews.service.js';

class CreateReviewDto {
  @ApiProperty({ enum: ['cancha', 'partido'] })
  @IsEnum(['cancha', 'partido'])
  tipo_objeto!: string;

  @ApiProperty()
  @IsUUID()
  objeto_id!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  puntaje!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comentario?: string;
}

class ListReviewsQueryDto {
  @ApiPropertyOptional({ enum: ['cancha', 'partido'] })
  @IsOptional()
  @IsEnum(['cancha', 'partido'])
  tipo_objeto?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  objeto_id?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

@ApiTags('reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear reseña de cancha o partido' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user.sub, {
      tipo_objeto: dto.tipo_objeto,
      objeto_id: dto.objeto_id,
      puntaje: dto.puntaje,
      ...(dto.comentario !== undefined && { comentario: dto.comentario }),
    });
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar reseñas (filtrable por tipo_objeto + objeto_id)' })
  async list(@Query() query: ListReviewsQueryDto) {
    return this.reviews.list({
      ...(query.tipo_objeto !== undefined && { tipo_objeto: query.tipo_objeto }),
      ...(query.objeto_id !== undefined && { objeto_id: query.objeto_id }),
      ...(query.page !== undefined && { page: query.page }),
      ...(query.limit !== undefined && { limit: query.limit }),
    });
  }
}
