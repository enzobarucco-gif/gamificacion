import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Modalidad } from '@pgd/db';

export class CreateMatchDto {
  @ApiProperty({ enum: Modalidad })
  @IsEnum(Modalidad)
  modalidad!: Modalidad;

  @ApiProperty({ description: 'Fecha y hora del partido (ISO 8601)' })
  @IsDateString()
  fecha!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  equipo_a_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  equipo_b_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  campo_id?: string;

  @ApiPropertyOptional({ enum: ['vs', 'pickup'], default: 'vs' })
  @IsOptional()
  @IsEnum(['vs', 'pickup'])
  tipo?: 'vs' | 'pickup';
}
