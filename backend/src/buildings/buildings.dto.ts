// src/buildings/buildings.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateBuildingDto {
  @ApiProperty({ example: 'Edificio Carlos Izaguirre' })
  @IsString() @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Jr. Carlos Izaguirre 123, Lima' })
  @IsString() @IsNotEmpty()
  direccion: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional() @IsNumber() @Min(1)
  nroDepas?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  cuentaBbva?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  cuentaBcp?: string;

  // Mapa de servicios habilitados: { agua: true, luz: true, limpieza: false }
  @ApiPropertyOptional({
    example: { agua: true, luz: true, internet: true, limpieza: false },
    description: 'Mapa de servicios habilitados para este edificio',
  })
  @IsOptional() @IsObject()
  serviciosActivos?: Record<string, boolean>;
}

export class UpdateBuildingDto extends PartialType(CreateBuildingDto) {}
