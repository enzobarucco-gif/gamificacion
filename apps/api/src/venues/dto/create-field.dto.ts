import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Modalidad } from '@pgd/db';
import { Type } from 'class-transformer';

export class CreateFieldDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ enum: Modalidad })
  @IsEnum(Modalidad)
  modalidad!: Modalidad;

  @ApiProperty({ description: 'Precio base en centavos' })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  precio_base_cents!: number;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Type(() => Number)
  duracion_min?: number;
}
