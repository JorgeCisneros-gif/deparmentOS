// src/buildings/buildings.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto, UpdateBuildingDto } from './buildings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Buildings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly svc: BuildingsService) {}

  @Post()
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Crear edificio' })
  create(@Body() dto: CreateBuildingDto) { return this.svc.create(dto); }

  @Get()
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Listar edificios' })
  findAll() { return this.svc.findAll(); }

  // Propietario puede ver su propio edificio
  @Get(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.PROPIETARIO)
  @ApiOperation({ summary: 'Ver edificio (propietarios pueden ver el suyo)' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch(':id')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar edificio' })
  update(@Param('id') id: string, @Body() dto: UpdateBuildingDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Eliminar edificio' })
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
