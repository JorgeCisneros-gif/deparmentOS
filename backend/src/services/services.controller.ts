// src/services/services.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './services.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Services')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERVISOR)
@Controller('services')
export class ServicesController {
  constructor(private readonly svc: ServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear servicio' })
  create(@Body() dto: CreateServiceDto) { return this.svc.create(dto); }

  @Get()
  @ApiOperation({ summary: 'Listar servicios' })
  @ApiQuery({ name: 'buildingId', required: false })
  findAll(@Query('buildingId') buildingId?: string) { return this.svc.findAll(buildingId); }

  @Get(':id')
  @ApiOperation({ summary: 'Ver servicio' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar servicio' })
  update(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar servicio' })
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
