// src/grupos/grupos.controller.ts
import {
  Controller, Get, Post, Patch, Body, Param,
  UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GruposService } from './grupos.service';
import { CreateGrupoDto, UpdateGrupoDto } from './grupos.dto';
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

  // Supervisor crea grupos para asignar a cuentas
  @Post()
@Roles(UserRole.SUPERVISOR)
@ApiOperation({ summary: 'Crear grupo (supervisor)' })
create(@Body() dto: CreateGrupoDto, @Request() req: any) {
  // Supervisor crea grupos sin cuenta — se asigna después al vincular con account
  return this.svc.create(dto, null)
}

  @Get()
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar grupos' })
  findAll(@Request() req: any) {
    // Supervisor ve todos — administrador solo el suyo
    const idAccount = req.user.role === UserRole.SUPERVISOR
      ? undefined
      : req.user.idAccount
    return this.svc.findAll(idAccount)
  }

  @Get('mi-grupo')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Obtener el grupo del administrador actual' })
  miGrupo(@Request() req: any) {
    if (req.user.role === UserRole.SUPERVISOR) {
      return this.svc.getSuperGrupo()
    }
    return this.svc.findByAccount(req.user.idAccount)
  }

  @Get(':id')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Ver grupo con sus edificios' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @Get(':id/stats')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Estadísticas del grupo' })
  getStats(@Param('id') id: string) {
    return this.svc.getStats(id)
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar grupo' })
  update(@Param('id') id: string, @Body() dto: UpdateGrupoDto) {
    return this.svc.update(id, dto)
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Desactivar grupo' })
  deactivate(@Param('id') id: string) {
    return this.svc.deactivate(id)
  }
}
