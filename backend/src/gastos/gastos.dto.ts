import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNumber, IsOptional, IsUUID, IsDateString,
  IsArray, IsIn, IsPositive, MaxLength, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGastoDto {
  @ApiProperty() @IsUUID()
  idEdificio: string;

  @ApiProperty() @IsString() @MaxLength(150)
  nombre: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  descripcion?: string;

  @ApiProperty() @IsDateString()
  fechaInicio: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  fechaFin?: string;

  @ApiPropertyOptional({ type: [String], nullable: true })
  @IsOptional() @IsArray() @IsUUID('4', { each: true })
  listaDepartamentos?: string[] | null;

  @ApiProperty() @IsNumber() @IsPositive() @Type(() => Number)
  montoGasto: number;
}

export class UpdateGastoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150)
  nombre?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  descripcion?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  fechaFin?: string;

  @ApiPropertyOptional({ type: [String], nullable: true })
  @IsOptional() @IsArray() @IsUUID('4', { each: true })
  listaDepartamentos?: string[] | null;

  @ApiPropertyOptional() @IsOptional() @IsNumber() @IsPositive() @Type(() => Number)
  montoGasto?: number;

  @ApiPropertyOptional({ enum: ['activo', 'cerrado', 'anulado'] })
  @IsOptional() @IsIn(['activo', 'cerrado', 'anulado'])
  estado?: 'activo' | 'cerrado' | 'anulado';
}

export class CreatePagoGastoDto {
  @ApiProperty() @IsUUID()
  idGastoExtra: string;

  @ApiProperty() @IsUUID()
  idDepartamento: string;

  @ApiProperty() @IsDateString()
  fechaPago: string;

  @ApiProperty() @IsNumber() @IsPositive() @Type(() => Number)
  monto: number;

  @ApiProperty({ enum: ['efectivo', 'transferencia', 'yape', 'plin', 'otro'] })
  @IsIn(['efectivo', 'transferencia', 'yape', 'plin', 'otro'])
  tipoPago: 'efectivo' | 'transferencia' | 'yape' | 'plin' | 'otro';

  @ApiPropertyOptional({ enum: ['bcp', 'bbva', 'interbank', 'scotiabank', 'otro'] })
  @IsOptional() @IsIn(['bcp', 'bbva', 'interbank', 'scotiabank', 'otro'])
  banco?: 'bcp' | 'bbva' | 'interbank' | 'scotiabank' | 'otro';

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100)
  referencia?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  comprobanteUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  observacion?: string;
}
