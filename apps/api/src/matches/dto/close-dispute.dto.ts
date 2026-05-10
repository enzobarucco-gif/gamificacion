import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CloseDisputeDto {
  @ApiProperty()
  @IsString()
  resolucion!: string;
}
