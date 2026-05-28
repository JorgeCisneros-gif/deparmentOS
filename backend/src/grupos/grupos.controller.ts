// src/grupos/grupos.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GruposService } from './grupos.service';
import {
  CreateGrupoDto, UpdateGrupoDto, UpdateSuscripcionDto,
  CreateGrupoAdminDto, ResetGrupoUserPasswordDto,
} from './grupos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Grupos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('grupos')
export class GruposController {
  constructor(private readonly svc: GruposService) {}

  // ── Supervisor: gestión completa ──────────────────────────────

  @Post()
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Crear grupo + primer administrador' })
  async create(@Body() dto: CreateGrupoDto, @Request() req: any) {
    // 1. Crear el grupo
    const grupo = await this.svc.create(dto, req.user.id);
    // 2. Crear el admin automáticamente
    const admin = await this.svc.createAdmin(grupo.id, {
      email:    dto.adminEmail,
      password: dto.adminPassword,
    });
    return { grupo, admin };
  }

  @Get()
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar grupos' })
  findAll(@Request() req: any) {
    // Supervisor ve todos — admin solo el suyo
    if (req.user.role === UserRole.SUPERVISOR) {
      return this.svc.findAll(false); // excluye SuperGrupo de la lista
    }
    return this.svc.findOne(req.user.idGrupo);
  }

  @Get('stats')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Estadísticas de grupos/suscripciones' })
  getStats() { return this.svc.getStats(); }

  @Get('mi-grupo')
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Obtener el grupo del usuario actual' })
  async miGrupo(@Request() req: any) {
    if (req.user.role === UserRole.SUPERVISOR) {
      return this.svc.getSuperGrupo();
    }
    return this.svc.findOne(req.user.idGrupo);
  }

  @Get(':id')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Ver grupo con edificios y usuarios' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar datos del grupo' })
  update(@Param('id') id: string, @Body() dto: UpdateGrupoDto) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/suscripcion')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar plan/suscripción del grupo' })
  updateSuscripcion(@Param('id') id: string, @Body() dto: UpdateSuscripcionDto) {
    return this.svc.updateSuscripcion(id, dto);
  }

  @Patch(':id/suspend')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Suspender grupo' })
  suspend(@Param('id') id: string) { return this.svc.suspend(id); }

  @Patch(':id/activate')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Reactivar grupo' })
  activate(@Param('id') id: string) { return this.svc.activate(id); }

  @Delete(':id')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Eliminar grupo en cascada' })
  remove(@Param('id') id: string) { return this.svc.remove(id); }

  // ── Administradores del grupo ─────────────────────────────────

  @Post(':id/admins')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Agregar administrador al grupo' })
  createAdmin(@Param('id') id: string, @Body() dto: CreateGrupoAdminDto) {
    return this.svc.createAdmin(id, dto);
  }

  @Patch(':id/users/:userId/reset-password')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Resetear contraseña de un usuario del grupo' })
  resetPassword(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: ResetGrupoUserPasswordDto,
  ) {
    return this.svc.resetUserPassword(id, userId, dto.newPassword);
  }
}
