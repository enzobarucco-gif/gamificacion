import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  slot_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partido_id?: string;

  @ApiPropertyOptional({ description: 'Seña en centavos (default: precio completo del slot)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sena_cents?: number;

  @ApiPropertyOptional({ default: 'mercado_pago', enum: ['mercado_pago', 'stripe'] })
  @IsOptional()
  proveedor?: 'mercado_pago' | 'stripe';
}
