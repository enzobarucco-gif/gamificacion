import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'usuario@example.com' })
  @IsEmail()
  email: string = '';

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string = '';

  @ApiProperty({ example: 'Matías Fernández' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string = '';

  @ApiPropertyOptional({ example: '+5491112345678' })
  @IsOptional()
  @IsString()
  telefono?: string;
}
