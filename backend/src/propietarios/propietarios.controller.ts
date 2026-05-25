// src/propietarios/propietarios.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PropietariosService } from './propietarios.service';
import { CreatePropietarioDto, UpdatePropietarioDto } from './propietarios.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Propietarios')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERVISOR)
@Controller('propietarios')
export class PropietariosController {
  constructor(private readonly svc: PropietariosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear propietario' })
  create(@Body() dto: CreatePropietarioDto) {
    return this.svc.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar propietarios con departamento asignado' })
  @ApiQuery({ name: 'buildingId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['activo', 'inactivo'] })
  findAll(
    @Query('buildingId') buildingId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.findAllWithDept(buildingId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver propietario' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar propietario' })
  update(@Param('id') id: string, @Body() dto: UpdatePropietarioDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar propietario' })
  deactivate(@Param('id') id: string) {
    return this.svc.deactivate(id);
  }
}
