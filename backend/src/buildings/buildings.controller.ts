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

@ApiTags('Buildings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly svc: BuildingsService) {}

  @Post()
  @Roles(UserRole.ADMINISTRADOR)   // supervisor + administrador
  @UseGuards(SubscriptionGuard)
  @SubscriptionCheck('edificios')  // valida límite según plan
  @ApiOperation({ summary: 'Crear edificio' })
  create(@Body() dto: CreateBuildingDto, @Request() req: any) {
    // Si es administrador, asociar el edificio a su cuenta
    if (req.user.idAccount) {
      dto['idAccount'] = req.user.idAccount;
    }
    return this.svc.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMINISTRADOR)   // supervisor + administrador
  @ApiOperation({ summary: 'Listar edificios' })
  findAll(@Request() req: any) {
    // Supervisor ve todos — administrador solo los de su cuenta
    const accountId = req.user.role === UserRole.SUPERVISOR
      ? undefined
      : req.user.idAccount;
    return this.svc.findAll(accountId);
  }

  @Get(':id')
  @Roles(UserRole.PROPIETARIO)     // todos los roles
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
  @Roles(UserRole.SUPERVISOR)      // solo supervisor puede eliminar
  @ApiOperation({ summary: 'Eliminar edificio' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
