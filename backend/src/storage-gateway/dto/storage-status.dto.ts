import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderType } from '../storage-gateway.types';

/**
 * Respuesta del endpoint GET /storage/status
 *
 * Indica al frontend si el grupo del usuario tiene Drive conectado,
 * y los datos del provider si es así.
 */
export class StorageStatusResponseDto {
  @ApiProperty({ example: true, description: 'Si hay provider configurado para el grupo' })
  configured: boolean;

  @ApiProperty({
    example: 'google_drive',
    enum: ['google_drive', 'internal'],
    description: 'Tipo de storage configurado',
  })
  type: ProviderType;

  @ApiPropertyOptional({
    example: 'admin@cliente.com',
    description: 'Email de la cuenta Google conectada',
  })
  connectedEmail?: string;

  @ApiPropertyOptional({
    example: 'DepartmentOS',
    description: 'Nombre de la carpeta raíz en Drive',
  })
  rootFolderName?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Si el provider está activo (puede haber sido desconectado)',
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    example: null,
    description: 'Último error reportado por el gateway (si hay)',
  })
  lastError?: string | null;

  @ApiPropertyOptional({
    example: null,
    description: 'Cuándo ocurrió el último error',
  })
  lastErrorAt?: string | null;

  @ApiPropertyOptional({
    example: '2026-06-19T15:30:00Z',
    description: 'Último upload exitoso',
  })
  lastSuccessAt?: string | null;

  @ApiPropertyOptional({
    example: 'Sin storage externo configurado',
    description: 'Mensaje informativo del gateway',
  })
  message?: string;
}
