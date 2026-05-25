// payments.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsEnum, IsIn, IsNumber, IsOptional,
  IsString, IsUUID, Min,
} from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty() @IsUUID() idCuota: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() idPropietario?: string;

  @ApiProperty({ example: '2024-03-20' })
  @IsDateString() fechaPago: string;

  @ApiProperty({ example: 89.50 })
  @IsNumber() @Min(0.01) montoCancelado: number;

  @ApiProperty({ enum: ['efectivo', 'transferencia', 'yape', 'plin', 'otro'], default: 'transferencia' })
  @IsIn(['efectivo', 'transferencia', 'yape', 'plin', 'otro']) tipoPago: string;

  @ApiPropertyOptional({ enum: ['bcp', 'bbva', 'interbank', 'scotiabank', 'otro'] })
  @IsOptional() @IsIn(['bcp', 'bbva', 'interbank', 'scotiabank', 'otro']) banco?: string;

  @ApiPropertyOptional({ example: 'OP-20240320-001' })
  @IsOptional() @IsString() referencia?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() observacion?: string;
}

export class CreatePagoAutoDto {
  @IsUUID()
  idCuota: string;
 
  @IsNumber()
  montoCancelado: number;
 
  @IsString()
  tipoPago: string;
 
  @IsOptional() @IsString()
  banco?: string;
 
  @IsOptional() @IsString()
  referencia?: string;
 
  @IsOptional() @IsString()
  observacion?: string;
 
  @IsString()
  fechaPago: string;
}
