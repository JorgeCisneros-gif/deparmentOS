// src/notificacion-config/notificacion-config.controller.ts
import {
  Controller, Get, Put, Body, Param,
  UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificacionConfigService } from './notificacion-config.service';
import { UpsertNotificacionConfigDto } from './notificacion-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Notificacion Config')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR) // admin + supervisor
@Controller('notificacion-config')
export class NotificacionConfigController {
  constructor(private readonly svc: NotificacionConfigService) {}

  // GET /notificacion-config/edificio/:idEdificio
  // Devuelve los tipos activos con su configuración (o defaults) para ese edificio
  @Get('edificio/:idEdificio')
  @ApiOperation({ summary: 'Obtener configuración de notificaciones por edificio' })
  getByEdificio(@Param('idEdificio') idEdificio: string) {
    return this.svc.getByEdificio(idEdificio);
  }

  // PUT /notificacion-config/edificio/:idEdificio
  // Upsert de una configuración específica
  @Put('edificio/:idEdificio')
  @ApiOperation({ summary: 'Guardar configuración de una notificación para el edificio' })
  upsert(
    @Param('idEdificio') idEdificio: string,
    @Body() dto: UpsertNotificacionConfigDto,
  ) {
    return this.svc.upsert(idEdificio, dto);
  }

  // PUT /notificacion-config/edificio/:idEdificio/bulk
  // Guardar todas las configuraciones del edificio a la vez
  @Put('edificio/:idEdificio/bulk')
  @ApiOperation({ summary: 'Guardar todas las configuraciones del edificio' })
  bulkUpsert(
    @Param('idEdificio') idEdificio: string,
    @Body() body: { configs: UpsertNotificacionConfigDto[] },
  ) {
    return this.svc.bulkUpsert(idEdificio, body.configs);
  }
}
