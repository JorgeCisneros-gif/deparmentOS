// src/grupos/grupos.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateGrupoDto {
  @ApiProperty({ example: 'Inmobiliaria Los Pinos S.A.' })
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiPropertyOptional({ example: '20123456789' })
  @IsOptional()
  @IsString()
  ruc?: string;

  @ApiPropertyOptional({ example: 'Av. Principal 123' })
  @IsOptional()
  @IsString()
  direccion?: string;
}

export class UpdateGrupoDto extends PartialType(CreateGrupoDto) {}
