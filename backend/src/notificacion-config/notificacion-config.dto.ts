// src/notificacion-config/notificacion-config.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsEnum, IsIn, IsInt, IsOptional,
  IsString, IsUUID, Matches, Max, Min,
} from 'class-validator';
import { TipoNotificacion, DestinatariosGestion } from './notificacion-config.entity';

export class UpsertNotificacionConfigDto {
  @ApiProperty({ enum: TipoNotificacion })
  @IsEnum(TipoNotificacion)
  tipo: TipoNotificacion;

  @ApiProperty({ example: true })
  @IsBoolean()
  activo: boolean;

  @ApiProperty({ example: '09:00', description: 'Hora de envío HH:MM' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'horaEnvio debe ser HH:MM (ej. 09:00)' })
  horaEnvio: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Días de offset. Para vencimiento_pago: días después del envío del mensaje. Para gastos_generales: días después de creación',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  diasOffset?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Día del mes (1-28). Solo para recoleccion_medicion',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  diaMes?: number;

  @ApiPropertyOptional({
    enum: DestinatariosGestion,
    description: 'Destinatarios para notificaciones de gestión',
  })
  @IsOptional()
  @IsEnum(DestinatariosGestion)
  destinatariosGestion?: DestinatariosGestion;
}

export class BulkUpsertNotificacionConfigDto {
  @ApiProperty({ type: [UpsertNotificacionConfigDto] })
  configs: UpsertNotificacionConfigDto[];
}
