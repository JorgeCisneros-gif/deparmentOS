// receipts.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional,
  IsString, IsUUID, Max, Min,
} from 'class-validator';

export class CreateReceiptDto {
  @ApiProperty() @IsUUID() idServicio: string;

  @ApiPropertyOptional({ example: 'REC-2024-001' })
  @IsOptional() @IsString() nroRecibo?: string;

  @ApiProperty({ example: 3, description: '1=Enero … 12=Diciembre' })
  @IsNumber() @Min(1) @Max(12) periodoMes: number;

  @ApiProperty({ example: 2024 })
  @IsNumber() @Min(2020) periodoAnio: number;

  @ApiPropertyOptional({ example: '2024-03-01' })
  @IsOptional() @IsDateString() fechaEmision?: string;

  @ApiPropertyOptional({ example: '2024-03-24' })
  @IsOptional() @IsDateString() fechaVencimiento?: string;

  @ApiProperty({ example: 270.00, description: 'Monto total de la factura del proveedor' })
  @IsNumber() @Min(0) montoTotalFactura: number;

  @ApiPropertyOptional({ example: 924.94, description: 'Solo para agua: lectura actual del medidor general' })
  @IsOptional() @IsNumber() m3LecturaActual?: number;

  @ApiPropertyOptional({ example: 908.56, description: 'Solo para agua: lectura anterior del medidor general' })
  @IsOptional() @IsNumber() m3LecturaAnterior?: number;

  @ApiPropertyOptional({ example: 'Empresa Limpieza SAC', description: 'Proveedor del servicio' })
  @IsOptional() @IsString() proveedor?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() observacion?: string;

  @ApiPropertyOptional()
  @IsOptional() detalleJson?: object;

  @ApiPropertyOptional({ description: 'Total m³/kWh de la factura del proveedor (para por_consumo_ajustado)' })
@IsOptional() @IsNumber() @Min(0)
totalUnidadesFactura?: number;
 
@ApiPropertyOptional({ description: 'm³/kWh propios (estimado manual o calculado desde mediciones)' })
@IsOptional() @IsNumber() @Min(0)
m3Propios?: number;
 
@ApiPropertyOptional({ description: 'Factor de ajuste editable. Si se omite, se calcula como totalUnidadesFactura / m3Propios' })
@IsOptional() @IsNumber() @Min(0)
factorAjuste?: number;
 
}

export class UpdateReceiptDto extends PartialType(CreateReceiptDto) {
  @ApiPropertyOptional({ enum: ['vigente', 'vencido', 'pagado', 'anulado'] })
  @IsOptional() @IsIn(['vigente', 'vencido', 'pagado', 'anulado']) status?: string;
}
