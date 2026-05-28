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
    // Asociar a la cuenta
    if (req.user.idAccount) {
      dto['idAccount'] = req.user.idAccount;
    }

    // Auto-asignar al grupo de la cuenta si no viene en el body
    if (!dto['idGrupo'] && req.user.idAccount) {
      const grupo = await this.gruposSvc.findByAccount(req.user.idAccount);
      if (grupo) dto['idGrupo'] = grupo.id;
    }

    // Supervisor: asignar al SuperGrupo si no viene grupo
    if (req.user.role === UserRole.SUPERVISOR && !dto['idGrupo']) {
      const superGrupo = await this.gruposSvc.getSuperGrupo();
      if (superGrupo) dto['idGrupo'] = superGrupo.id;
    }

    return this.svc.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar edificios' })
  async findAll(@Request() req: any) {
    if (req.user.role === UserRole.SUPERVISOR) {
      return this.svc.findAll(); // todos
    }
    // Administrador — edificios de su grupo
    const grupo = await this.gruposSvc.findByAccount(req.user.idAccount);
    return this.svc.findByGrupo(grupo?.id);
  }

  @Get(':id')
  @Roles(UserRole.PROPIETARIO)
  @ApiOperation({ summary: 'Ver edificio' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar edificio' })
  update(@Param('id') id: string, @Body() dto: UpdateBuildingDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Eliminar edificio' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
