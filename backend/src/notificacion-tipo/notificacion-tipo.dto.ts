// src/notificacion-tipo/notificacion-tipo.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean, IsInt, IsNotEmpty, IsOptional,
  IsString, Matches, Max, Min,
} from 'class-validator';

export class CreateNotificacionTipoDto {
  @ApiProperty({ example: 'recordatorio_reunion' })
  @IsString() @IsNotEmpty()
  @Matches(/^[a-z_]+$/, { message: 'codigo solo puede contener letras minúsculas y guiones bajos' })
  codigo: string;

  @ApiProperty({ example: 'Recordatorio de reunión mensual' })
  @IsString() @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ example: 'Notifica a los propietarios sobre la reunión mensual' })
  @IsOptional() @IsString()
  descripcion?: string;

  @ApiProperty({
    example: 'propietarios',
    description: 'Destinatarios separados por coma. Valores: propietarios, gestion, admin',
  })
  @IsString() @IsNotEmpty()
  destinatarios: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional() @IsInt() @Min(0) @Max(100)
  orden?: number;

  @ApiPropertyOptional({ example: '💰 Pago pendiente — {periodo}' })
  @IsOptional() @IsString()
  templateTitulo?: string;

  @ApiPropertyOptional({ example: 'Depto {departamento}: S/. {saldo} pendiente.' })
  @IsOptional() @IsString()
  templateCuerpo?: string;

  @ApiPropertyOptional({ example: '["periodo","departamento","saldo"]' })
  @IsOptional() @IsString()
  variablesDisponibles?: string;
}

export class UpdateNotificacionTipoDto extends PartialType(CreateNotificacionTipoDto) {
  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional({ example: '💰 Pago pendiente — {periodo}' })
  @IsOptional() @IsString()
  templateTitulo?: string;

  @ApiPropertyOptional({ example: 'Depto {departamento}: S/. {saldo} pendiente.' })
  @IsOptional() @IsString()
  templateCuerpo?: string;

  @ApiPropertyOptional({ example: '["periodo","departamento","saldo"]' })
  @IsOptional() @IsString()
  variablesDisponibles?: string;
}
