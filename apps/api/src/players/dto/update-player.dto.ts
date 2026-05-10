import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

enum PieHabilEnum { derecho = 'derecho', izquierdo = 'izquierdo', ambos = 'ambos' }
enum PrivacidadEnum { publico = 'publico', semipublico = 'semipublico', privado = 'privado' }

export class UpdatePlayerDto {
  @ApiPropertyOptional({ example: 'delantero' })
  @IsOptional()
  @IsString()
  posicion?: string;

  @ApiPropertyOptional({ enum: PieHabilEnum })
  @IsOptional()
  @IsEnum(PieHabilEnum)
  pie_habil?: string;

  @ApiPropertyOptional({ example: '1995-06-15' })
  @IsOptional()
  @IsDateString()
  fecha_nac?: string;

  @ApiPropertyOptional({ minimum: 100, maximum: 250 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(250)
  estatura_cm?: number;

  @ApiPropertyOptional({ enum: PrivacidadEnum })
  @IsOptional()
  @IsEnum(PrivacidadEnum)
  privacidad?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  foto_url?: string;
}
