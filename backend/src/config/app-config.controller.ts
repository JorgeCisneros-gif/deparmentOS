// src/config/app-config.controller.ts
import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AppConfigService } from './app-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Config')
@Controller('config')
export class AppConfigController {
  constructor(private readonly svc: AppConfigService) {}

  // Público — cualquier usuario autenticado puede leer la config
  @Get()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener toda la configuración del sistema' })
  getAll() { return this.svc.getAll(); }

  @Get(':clave')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obtener un valor de configuración' })
  getOne(@Param('clave') clave: string) { return this.svc.getOne(clave); }

  // Solo supervisor puede modificar la config
  @Patch(':clave')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar un valor de configuración' })
  set(@Param('clave') clave: string, @Body() body: { valor: any }) {
    return this.svc.set(clave, body.valor);
  }
}
