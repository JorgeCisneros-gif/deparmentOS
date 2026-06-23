import {
  Controller, Get, UseGuards, Request, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StorageGatewayService } from './storage-gateway.service';
import { StorageStatusResponseDto } from './dto/storage-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

/**
 * Endpoints REST para que el frontend consulte el estado del Storage Gateway.
 */
@ApiTags('Storage')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('storage')
export class StorageGatewayController {
  constructor(private readonly gateway: StorageGatewayService) {}

  // ── Estado del Drive del grupo (detallado) ────────────────────

  @Get('status')
  @Roles(UserRole.GESTION)
  @ApiOperation({
    summary: 'Estado completo del Drive conectado para el grupo del usuario',
    description:
      'Devuelve toda la información del provider configurado: tipo, email, ' +
      'carpeta, fechas de éxito/error, etc.',
  })
  @ApiResponse({ status: 200, type: StorageStatusResponseDto })
  async getStatus(@Request() req): Promise<StorageStatusResponseDto> {
    const orgId = req.user?.idGrupo;
    if (!orgId) {
      throw new BadRequestException(
        'Tu usuario no está asociado a un grupo. Contacta al soporte.',
      );
    }
    return this.gateway.getProviderStatus(orgId);
  }

  // ── Indicador compacto para mostrar en headers ────────────────

  @Get('indicator')
  @Roles(UserRole.PROPIETARIO) // accesible por todos los roles
  @ApiOperation({
    summary: 'Indicador compacto del estado de almacenamiento',
    description:
      'Endpoint optimizado para el indicador visual del dashboard. ' +
      'Devuelve un estado simple: drive | local | error. ' +
      'Cachea para no saturar el gateway.',
  })
  async getIndicator(@Request() req): Promise<{
    mode: 'drive' | 'local' | 'unavailable';
    label: string;
    color: 'green' | 'yellow' | 'red';
    detail?: string;
  }> {
    const orgId = req.user?.idGrupo;

    if (!orgId) {
      return {
        mode: 'unavailable',
        label: 'Sin grupo',
        color: 'red',
        detail: 'Tu usuario no está asociado a un grupo',
      };
    }

    if (!this.gateway.isEnabled()) {
      return {
        mode: 'local',
        label: 'Almacenamiento local',
        color: 'yellow',
        detail: 'Las fotos se guardan en el servidor',
      };
    }

    try {
      const status = await this.gateway.getProviderStatus(orgId);

      if (status.configured && status.isActive && status.type === 'google_drive') {
        return {
          mode: 'drive',
          label: 'Drive conectado',
          color: 'green',
          detail: `Las fotos se guardan en ${status.connectedEmail || 'tu Drive'}`,
        };
      }

      if (status.configured && !status.isActive) {
        return {
          mode: 'unavailable',
          label: 'Drive con error',
          color: 'red',
          detail: status.lastError ?? 'Reconectar Drive',
        };
      }

      // Sin Drive configurado → fotos locales
      return {
        mode: 'local',
        label: 'Almacenamiento local',
        color: 'yellow',
        detail: 'Conecta Google Drive para resguardar tus fotos',
      };
    } catch (err) {
      return {
        mode: 'unavailable',
        label: 'Sin conexión',
        color: 'red',
        detail: 'Storage Gateway no responde',
      };
    }
  }

  // ── Health (diagnóstico técnico) ──────────────────────────────

  @Get('health')
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Health check del Storage Gateway' })
  async getHealth() {
    return this.gateway.checkHealth();
  }
}
