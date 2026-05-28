// src/buildings/buildings.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto, UpdateBuildingDto } from './buildings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SubscriptionGuard, SubscriptionCheck } from '../auth/guards/subscription.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { GruposService } from '../grupos/grupos.service';

@ApiTags('Buildings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('buildings')
export class BuildingsController {
  constructor(
    private readonly svc:       BuildingsService,
    private readonly gruposSvc: GruposService,
  ) {}

  @Post()
  @Roles(UserRole.ADMINISTRADOR)
  @UseGuards(SubscriptionGuard)
  @SubscriptionCheck('edificios')
  @ApiOperation({ summary: 'Crear edificio' })
  async create(@Body() dto: CreateBuildingDto, @Request() req: any) {
    // Auto-asignar grupo
    if (!dto['idGrupo']) {
      if (req.user.role === UserRole.SUPERVISOR) {
        const superGrupo = await this.gruposSvc.getSuperGrupo();
        dto['idGrupo'] = superGrupo.id;
      } else if (req.user.idGrupo) {
        dto['idGrupo'] = req.user.idGrupo;
      }
    }
    return this.svc.create(dto);
  }

  @Get()
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Listar edificios' })
  async findAll(@Request() req: any) {
    if (req.user.role === UserRole.SUPERVISOR) {
      return this.svc.findAll(); // todos
    }
    // Admin/gestión: solo edificios de su grupo
    return this.svc.findByGrupo(req.user.idGrupo);
  }

  @Get(':id')
  @Roles(UserRole.PROPIETARIO)
  @ApiOperation({ summary: 'Ver edificio' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar edificio (incluye cambio de grupo)' })
  update(@Param('id') id: string, @Body() dto: UpdateBuildingDto, @Request() req: any) {
    // Solo supervisor puede cambiar el grupo de un edificio
    if (dto['idGrupo'] && req.user.role !== UserRole.SUPERVISOR) {
      delete dto['idGrupo'];
    }
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Eliminar edificio' })
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
