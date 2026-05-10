import { IsArray, IsEnum, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProveedorPago } from '@pgd/db';

class SplitItemDto {
  @ApiProperty()
  @IsUUID()
  usuario_id!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  monto_cents!: number;
}

export class InitSplitDto {
  @ApiProperty()
  @IsUUID()
  reserva_id!: string;

  @ApiProperty({ enum: ProveedorPago })
  @IsEnum(ProveedorPago)
  proveedor!: ProveedorPago;

  @ApiProperty({ type: [SplitItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitItemDto)
  splits!: SplitItemDto[];
}
