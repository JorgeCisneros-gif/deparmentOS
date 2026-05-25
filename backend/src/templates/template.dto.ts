import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean, IsEnum, IsNotEmpty, IsOptional,
  IsString, IsUUID,
} from 'class-validator';
import { TemplateTipo } from './template.entity';

export class CreateTemplateDto {
  @ApiProperty() @IsUUID() idEdificio: string;

  @ApiProperty({ enum: TemplateTipo, description: 'Tipo de mensaje' })
  @IsEnum(TemplateTipo) tipo: TemplateTipo;

  @ApiProperty({ example: 'Cuota mensual con emoji' })
  @IsString() @IsNotEmpty() nombre: string;

  @ApiPropertyOptional() @IsOptional() @IsString() descripcion?: string;

  @ApiProperty({
    description: `Cuerpo del mensaje con variables entre dobles llaves.
Variables disponibles según tipo:

**cuota_servicios / recordatorio_pago:**
{{propietario}} {{depto}} {{edificio}} {{periodo}} {{mes}} {{anio}}
{{m3}} {{precio_m3}} {{monto_agua}} {{monto_luz}} {{monto_internet}}
{{monto_limpieza}} {{monto_otros}} {{ajuste}} {{monto_total}}
{{fecha_vencimiento}} {{status_pago}}

**limpieza:**
{{propietario}} {{depto}} {{edificio}} {{periodo}}
{{dias_trabajados}} {{ambientes}} {{costo_dia}}
{{monto_total_limpieza}} {{cuota_depto}} {{nro_deptos}}

**bienvenida / aviso_general:**
{{propietario}} {{depto}} {{edificio}} {{mensaje_libre}}`,
    example: 'Hola {{propietario}}, su cuota de {{periodo}} es S/. {{monto_total}}.',
  })
  @IsString() @IsNotEmpty() cuerpo: string;

  @ApiPropertyOptional({ default: false, description: 'Si TRUE reemplaza la plantilla default del mismo tipo' })
  @IsOptional() @IsBoolean() esDefault?: boolean;
}

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}

// ── Para renderizar un mensaje con datos reales ───────────────

export class RenderTemplateDto {
  @ApiProperty({ description: 'UUID de la plantilla a usar' })
  @IsUUID() templateId: string;

  @ApiPropertyOptional({ description: 'UUID de la cuota (para cuota_servicios y recordatorio_pago)' })
  @IsOptional() @IsUUID() feeId?: string;

  @ApiPropertyOptional({ description: 'UUID del registro de limpieza (para tipo limpieza)' })
  @IsOptional() @IsUUID() cleaningRecordId?: string;

  @ApiPropertyOptional({ description: 'UUID del departamento (para bienvenida o aviso_general)' })
  @IsOptional() @IsUUID() departamentoId?: string;

  @ApiPropertyOptional({
    description: 'Variables libres adicionales para reemplazar en el cuerpo. Ej: {"mensaje_libre": "Habrá corte de agua el lunes."}',
    example: { mensaje_libre: 'Habrá corte de agua el lunes 18 de marzo de 8am a 12pm.' },
  })
  @IsOptional() variablesExtra?: Record<string, string>;
}

export class RenderAllDto {
  @ApiProperty({ description: 'UUID de la plantilla' }) @IsUUID() templateId: string;

  @ApiProperty({ description: 'UUID del edificio' }) @IsUUID() idEdificio: string;

  @ApiPropertyOptional({ description: 'UUID de la cuota (si aplica al tipo)' })
  @IsOptional() @IsUUID() feeId?: string;

  @ApiPropertyOptional({ description: 'UUID del registro de limpieza (si aplica)' })
  @IsOptional() @IsUUID() cleaningRecordId?: string;

  @ApiPropertyOptional()
  @IsOptional() variablesExtra?: Record<string, string>;
}
