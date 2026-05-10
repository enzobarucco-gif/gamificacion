import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BulkCreateSlotsDto {
  @ApiProperty({ description: 'Inicio del rango de generación (ISO 8601)' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'Fin del rango de generación (ISO 8601)' })
  @IsDateString()
  to!: string;

  @ApiProperty({ description: 'Duración de cada slot en minutos', example: 60 })
  @IsInt()
  @Min(30)
  @Type(() => Number)
  duracion_min!: number;

  @ApiPropertyOptional({ description: 'Precio override en centavos (usa precio_base del campo si no se indica)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  precio_cents?: number;
}
