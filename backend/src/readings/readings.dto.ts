import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean, IsNotEmpty, IsNumber, IsOptional,
  IsString, IsUUID, Min,
} from 'class-validator';

export class CreateReadingDto {
  @ApiProperty({ description: 'UUID del recibo de agua al que pertenece esta medición' })
  @IsUUID() idRecibo: string;

  @ApiProperty({ description: 'UUID del departamento' })
  @IsUUID() idDepartamento: string;

  @ApiProperty({ example: 924.94, description: 'Lectura actual del medidor del depto (m3 acumulado)' })
  @IsNumber() @Min(0) lecturaActual: number;

  @ApiProperty({ example: 908.56, description: 'Lectura anterior del medidor del depto' })
  @IsNumber() @Min(0) lecturaAnterior: number;

  @ApiProperty({ example: 59.12, description: 'Monto calculado: m3_consumido × precio_m3 del recibo' })
  @IsNumber() @Min(0) montoCalculado: number;

  @ApiPropertyOptional({ default: false, description: 'True si corresponde a zona común (lobby, etc.)' })
  @IsOptional() @IsBoolean() esZonaComun?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString() observacion?: string;
}

export class UpdateReadingDto extends PartialType(CreateReadingDto) {}

export class ConfirmOcrReadingDto {
  @ApiProperty({ description: 'UUID del recibo' }) @IsUUID() idRecibo: string;
  @ApiProperty({ description: 'UUID del departamento' }) @IsUUID() idDepartamento: string;
  @ApiProperty({ example: 1452.0, description: 'Lectura final confirmada (puede editar el valor OCR)' })
  @IsNumber() @Min(0) lecturaFinal: number;
  @ApiProperty({ example: 1435.5, description: 'Lectura anterior del medidor' })
  @IsNumber() @Min(0) lecturaAnterior: number;
  @ApiProperty({ example: 59.12 }) @IsNumber() @Min(0) montoCalculado: number;
  @ApiPropertyOptional() @IsOptional() @IsString() observacion?: string;
}
