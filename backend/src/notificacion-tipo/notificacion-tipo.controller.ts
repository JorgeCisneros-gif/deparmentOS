// src/notificacion-tipo/notificacion-tipo.controller.ts
import {
  Controller, Get, Post, Patch, Body, Param,
  UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { NotificacionTipoService } from './notificacion-tipo.service';
import { CreateNotificacionTipoDto, UpdateNotificacionTipoDto } from './notificacion-tipo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Notificacion Tipo')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notificacion-tipo')
export class NotificacionTipoController {
  constructor(private readonly svc: NotificacionTipoService) {}

  // GET — administrador puede ver el catálogo (para mostrar las tarjetas)
  @Get()
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar tipos de notificación' })
  @ApiQuery({ name: 'soloActivos', required: false, type: Boolean })
  findAll(@Query('soloActivos') soloActivos?: string) {
    return this.svc.findAll(soloActivos === 'true');
  }

  @Get(':id')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Ver tipo de notificación' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  // POST / PATCH — solo supervisor puede crear y editar tipos
  @Post()
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Crear nuevo tipo de notificación (supervisor)' })
  create(@Body() dto: CreateNotificacionTipoDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Editar tipo de notificación (supervisor)' })
  update(@Param('id') id: string, @Body() dto: UpdateNotificacionTipoDto) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/toggle')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Activar/desactivar tipo (supervisor)' })
  toggle(@Param('id') id: string) {
    return this.svc.toggleActivo(id);
  }
}
