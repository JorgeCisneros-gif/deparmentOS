import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray, IsDateString, IsIn, IsNotEmpty, IsNumber,
  IsOptional, IsString, IsUUID, Max, Min, ValidateNested, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Proveedor ─────────────────────────────────────────────────

export class CreateProviderDto {
  @ApiProperty() @IsUUID() idEdificio: string;

  @ApiProperty({ example: 'María García' })
  @IsString() @IsNotEmpty() nombre: string;

  @ApiPropertyOptional({ example: '51999888777' })
  @IsOptional() @IsString() telefono?: string;

  @ApiPropertyOptional({ enum: ['bcp', 'bbva', 'interbank', 'scotiabank', 'otro'] })
  @IsOptional() @IsIn(['bcp', 'bbva', 'interbank', 'scotiabank', 'otro']) banco?: string;

  @ApiPropertyOptional({ enum: ['ahorros', 'corriente', 'yape', 'plin', 'efectivo'], default: 'ahorros' })
  @IsOptional() @IsIn(['ahorros', 'corriente', 'yape', 'plin', 'efectivo']) tipoCuenta?: string;

  @ApiPropertyOptional({ example: '191-12345678-0-01' })
  @IsOptional() @IsString() nroCuenta?: string;

  @ApiProperty({ example: 40.00, description: 'Costo base por día de trabajo' })
  @IsNumber() @Min(0) costoPorDia: number;
}

export class UpdateProviderDto extends PartialType(CreateProviderDto) {}

// ── Ambiente ──────────────────────────────────────────────────

export class CreateAreaDto {
  @ApiProperty() @IsUUID() idEdificio: string;

  @ApiProperty({ example: 'Cochera' })
  @IsString() @IsNotEmpty() nombre: string;

  @ApiPropertyOptional({ example: 'Limpieza de la cochera y acceso vehicular' })
  @IsOptional() @IsString() descripcion?: string;

  @ApiPropertyOptional({ example: 0, description: 'Costo extra adicional al costo base por día' })
  @IsOptional() @IsNumber() @Min(0) costoExtra?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @IsNumber() orden?: number;
}

export class UpdateAreaDto extends PartialType(CreateAreaDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() activo?: boolean;
}

// ── Detalle de un día de limpieza ─────────────────────────────

export class DiaLimpiezaDto {
  @ApiProperty({ example: '2024-03-05' }) @IsDateString() fecha: string;

  @ApiPropertyOptional({ type: [String], description: 'Nombres de ambientes limpiados ese día' })
  @IsOptional() @IsArray() @IsString({ each: true }) ambientes?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() nota?: string;
}

// ── Registro mensual ──────────────────────────────────────────

export class CreateCleaningRecordDto {
  @ApiProperty() @IsUUID() idEdificio: string;
  @ApiProperty() @IsUUID() idProveedor: string;

  @ApiProperty({ example: 3 }) @IsNumber() @Min(1) @Max(12) periodoMes: number;
  @ApiProperty({ example: 2024 }) @IsNumber() @Min(2020) periodoAnio: number;

  @ApiProperty({ example: 9, description: 'Total de días trabajados en el mes' })
  @IsNumber() @Min(0) diasTrabajados: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'UUIDs de los ambientes limpiados este mes',
  })
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) ambientesIds?: string[];

  @ApiPropertyOptional({
    type: [DiaLimpiezaDto],
    description: 'Detalle día a día (opcional, para auditoría)',
  })
  @IsOptional() @IsArray() @ValidateNested({ each: true })
  @Type(() => DiaLimpiezaDto) detalleDias?: DiaLimpiezaDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() observaciones?: string;
}

export class UpdateCleaningRecordDto extends PartialType(CreateCleaningRecordDto) {
  @ApiPropertyOptional({ enum: ['pendiente', 'pagado'] })
  @IsOptional() @IsIn(['pendiente', 'pagado']) pagoProveedorStatus?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() pagoProveedorFecha?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() pagoProveedorRef?: string;
}

// ── Confirmar pago al proveedor ───────────────────────────────

export class ConfirmProviderPaymentDto {
  @ApiProperty({ example: '2024-03-28' }) @IsDateString() fecha: string;

  @ApiPropertyOptional({ example: 'OP-20240328-001' })
  @IsOptional() @IsString() referencia?: string;
}
