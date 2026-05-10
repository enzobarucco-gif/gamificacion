import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateMatchDto {
  @ApiProperty({ description: 'true = acepta el resultado; false = abre disputa' })
  @IsBoolean()
  ok!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}
