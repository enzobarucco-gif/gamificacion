import { IsArray, IsInt, IsOptional, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ParticipacionDto {
  @ApiProperty()
  @IsUUID()
  jugador_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  minutos?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  goles?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  asistencias?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  atajadas?: number;

  @ApiPropertyOptional({ description: 'Calificación del 1 al 10' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  calificacion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  notas?: string;
}

export class LoadStatsDto {
  @ApiProperty({ type: [ParticipacionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipacionDto)
  participaciones!: ParticipacionDto[];
}
