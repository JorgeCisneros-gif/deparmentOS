// src/notificacion-config/notificacion-config.controller.ts
import {
  Controller, Get, Put, Body, Param,
  UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificacionConfigService } from './notificacion-config.service';
import {
  UpsertNotificacionConfigDto,
  BulkUpsertNotificacionConfigDto,
} from './notificacion-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Notificacion Config')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR) // admin + supervisor pueden ver/editar
@Controller('notificacion-config')
export class NotificacionConfigController {
  constructor(private readonly svc: NotificacionConfigService) {}

  // GET /notificacion-config/mi-grupo
  // Devuelve las 4 configuraciones del grupo del usuario logueado
  @Get('mi-grupo')
  @ApiOperation({ summary: 'Obtener configuraciones del grupo del usuario' })
  getMiGrupo(@Request() req: any) {
    const idGrupo = req.user.idGrupo;
    // Supervisor no tiene grupo propio — devolver vacío
    if (!idGrupo) return [];
    return this.svc.getByGrupo(idGrupo);
  }

  // GET /notificacion-config/grupo/:idGrupo (solo supervisor)
  @Get('grupo/:idGrupo')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener configuraciones de un grupo (supervisor)' })
  getByGrupo(@Param('idGrupo') idGrupo: string) {
    return this.svc.getByGrupo(idGrupo);
  }

  // PUT /notificacion-config/mi-grupo — actualizar una config
  @Put('mi-grupo')
  @ApiOperation({ summary: 'Guardar una configuración de notificación' })
  upsertMiGrupo(@Request() req: any, @Body() dto: UpsertNotificacionConfigDto) {
    const idGrupo = req.user.idGrupo;
    return this.svc.upsert(idGrupo, dto);
  }

  // PUT /notificacion-config/mi-grupo/bulk — guardar todas a la vez
  @Put('mi-grupo/bulk')
  @ApiOperation({ summary: 'Guardar todas las configuraciones de notificación del grupo' })
  bulkUpsertMiGrupo(@Request() req: any, @Body() dto: BulkUpsertNotificacionConfigDto) {
    const idGrupo = req.user.idGrupo;
    return this.svc.bulkUpsert(idGrupo, dto.configs);
  }

  // PUT /notificacion-config/grupo/:idGrupo (supervisor)
  @Put('grupo/:idGrupo')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Guardar configuración de un grupo (supervisor)' })
  upsertByGrupo(
    @Param('idGrupo') idGrupo: string,
    @Body() dto: UpsertNotificacionConfigDto,
  ) {
    return this.svc.upsert(idGrupo, dto);
  }
}
