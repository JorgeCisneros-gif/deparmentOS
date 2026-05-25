import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsIn, IsNumber, IsOptional, IsUUID, Max, Min,
} from 'class-validator';

export class CalculateFeesDto {
  @ApiProperty({ description: 'UUID del edificio' })
  @IsUUID() idEdificio: string;

  @ApiProperty({ example: 3 }) @IsNumber() @Min(1) @Max(12) periodoMes: number;
  @ApiProperty({ example: 2024 }) @IsNumber() @Min(2020) periodoAnio: number;

  @ApiPropertyOptional({ example: '2024-03-24' })
  @IsOptional() @IsDateString() fechaVencimiento?: string;
}

export class UpdateFeeStatusDto {
  @ApiProperty({ enum: ['pendiente', 'pagado', 'vencido', 'parcial'] })
  @IsIn(['pendiente', 'pagado', 'vencido', 'parcial']) status: string;
}
