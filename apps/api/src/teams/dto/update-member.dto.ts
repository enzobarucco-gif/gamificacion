import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoMiembro, RolEnEquipo } from '@pgd/db';

export class UpdateMemberDto {
  @ApiPropertyOptional({ enum: RolEnEquipo })
  @IsOptional()
  @IsEnum(RolEnEquipo)
  rol?: RolEnEquipo;

  @ApiPropertyOptional({ enum: EstadoMiembro })
  @IsOptional()
  @IsEnum(EstadoMiembro)
  estado?: EstadoMiembro;
}
