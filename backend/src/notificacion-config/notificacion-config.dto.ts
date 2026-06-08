// src/notificacion-config/notificacion-config.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsInt, IsOptional, IsString,
  IsUUID, Matches, Max, Min,
} from 'class-validator';

export class UpsertNotificacionConfigDto {
  @ApiProperty({ description: 'UUID del tipo de notificación' })
  @IsUUID()
  idTipo: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  activo: boolean;

  @ApiProperty({
    example: '0 9 * * *',
    description: 'Expresión cron. Ejemplos: "0 9 * * *" = diario 9am, "0 8 15 * *" = día 15 cada mes 8am',
  })
  @IsString()
  @Matches(/^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)$/, {
    message: 'cronExpresion debe ser una expresión cron válida (5 campos)',
  })
  cronExpresion: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Días de espera desde el evento base',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  diasOffset?: number;
}

// Helper para construir cron desde campos simples
export function buildCron(hora: string, frecuencia: 'diario' | 'mensual', diaMes?: number): string {
  const [h, m] = hora.split(':');
  if (frecuencia === 'mensual' && diaMes) {
    return `${m} ${h} ${diaMes} * *`;
  }
  return `${m} ${h} * * *`;
}

// Helper para parsear cron a campos simples
export function parseCron(cron: string): { hora: string; frecuencia: 'diario' | 'mensual'; diaMes?: number } {
  const parts = cron.split(' ');
  const min   = parts[0];
  const hour  = parts[1];
  const day   = parts[2];
  const hora  = `${hour.padStart(2,'0')}:${min.padStart(2,'0')}`;
  if (day !== '*') {
    return { hora, frecuencia: 'mensual', diaMes: parseInt(day) };
  }
  return { hora, frecuencia: 'diario' };
}
