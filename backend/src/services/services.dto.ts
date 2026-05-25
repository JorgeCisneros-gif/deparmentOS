// src/services/services.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { TipoServicio, ModoCalculo } from './service.entity';

export class CreateServiceDto {
  @ApiProperty() @IsUUID()
  idEdificio: string;

  @ApiProperty({ example: 'Agua Sedapal' })
  @IsString() @IsNotEmpty()
  nombreServicio: string;

  @ApiProperty({ enum: TipoServicio })
  @IsEnum(TipoServicio)
  tipo: TipoServicio;

  @ApiProperty({ enum: ModoCalculo })
  @IsEnum(ModoCalculo)
  modoCalculo: ModoCalculo;

  // Requerida cuando modoCalculo = 'por_consumo_m3'
  // Define la unidad del medidor y el label en las lecturas
  @ApiPropertyOptional({
    enum: ['m3', 'kwh', 'unidad'],
    description: 'm3=metros cúbicos (agua/gas), kwh=kilovatios hora (luz), unidad=genérico',
  })
  @IsOptional()
  @IsIn(['m3', 'kwh', 'unidad'])
  unidadMedida?: 'm3' | 'kwh' | 'unidad' | null;

  @ApiPropertyOptional({
    example: { proveedor: 'Empresa Limpieza SAC', zonas: ['Lobby', 'Escaleras'] },
    description: 'Detalle adicional según el tipo de servicio',
  })
  @IsOptional() @IsObject()
  detalleServicio?: Record<string, any>;
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  activo?: boolean;
}
