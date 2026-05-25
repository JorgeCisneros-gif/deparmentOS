// src/propietarios/propietarios.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePropietarioDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString() @IsNotEmpty() @MaxLength(150) nombre: string;

  @ApiPropertyOptional({ example: '999888777' })
  @IsOptional() @IsString() telefono?: string;

  @ApiPropertyOptional({ example: 'juan@gmail.com' })
  @IsOptional() @IsString() correo?: string;

  @ApiPropertyOptional({ enum: ['bcp', 'bbva', 'interbank', 'scotiabank', 'otro'] })
  @IsOptional() @IsEnum(['bcp', 'bbva', 'interbank', 'scotiabank', 'otro']) banco?: string;

  @ApiPropertyOptional({ enum: ['efectivo', 'transferencia', 'yape', 'plin', 'otro'] })
  @IsOptional() @IsEnum(['efectivo', 'transferencia', 'yape', 'plin', 'otro']) tipoPago?: string;

  @ApiPropertyOptional({ enum: ['activo', 'inactivo'] })
  @IsOptional() @IsEnum(['activo', 'inactivo']) status?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() observacion?: string;

  @ApiPropertyOptional({ description: 'Departamento a vincular al crear el propietario' })
  @IsOptional() @IsString() idDepartamento?: string;
}

export class UpdatePropietarioDto extends PartialType(CreatePropietarioDto) {
  @ApiPropertyOptional({ enum: ['activo', 'inactivo'] })
  @IsOptional() @IsEnum(['activo', 'inactivo']) status?: string;
}
