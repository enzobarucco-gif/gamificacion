import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProveedorPago } from '@pgd/db';

export class InitCheckoutDto {
  @ApiProperty()
  @IsUUID()
  reserva_id!: string;

  @ApiProperty({ enum: ProveedorPago })
  @IsEnum(ProveedorPago)
  proveedor!: ProveedorPago;
}
