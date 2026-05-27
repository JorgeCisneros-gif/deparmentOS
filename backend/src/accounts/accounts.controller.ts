// src/accounts/accounts.controller.ts
import {
  Controller, Get, Post, Patch, Body, Param,
  UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto, ResetAccountPasswordDto } from './accounts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';

@ApiTags('Accounts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly svc:      AccountsService,
    private readonly usersSvc: UsersService,
  ) {}

  @Post()
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Crear cuenta + primer usuario administrador' })
  async create(@Body() dto: CreateAccountDto, @Request() req: any) {
    // 1. Crear la cuenta
    const account = await this.svc.create(dto, req.user.id);

    // 2. Crear el usuario administrador con idAccount y opcionalmente idEdificio
    await this.usersSvc.create({
      email:      dto.email,
      password:   dto.adminPassword,
      role:       UserRole.ADMINISTRADOR,
      idAccount:  account.id,
      idEdificio: (dto as any).idEdificio || null,
    } as any);

    return account;
  }

  @Get()
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Listar todas las cuentas' })
  findAll() { return this.svc.findAll(); }

  @Get('stats')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Estadísticas de cuentas' })
  getStats() { return this.svc.getStats(); }

  @Get(':id')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Ver detalle de una cuenta' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch(':id')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar plan o datos de cuenta' })
  update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/suspend')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Suspender cuenta' })
  suspend(@Param('id') id: string) { return this.svc.suspend(id); }

  @Patch(':id/activate')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Reactivar cuenta' })
  activate(@Param('id') id: string) { return this.svc.activate(id); }

  @Patch(':id/reset-password')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Resetear contraseña del administrador de la cuenta' })
  resetPassword(@Param('id') id: string, @Body() dto: ResetAccountPasswordDto) {
    return this.svc.resetAdminPassword(id, dto);
  }
}
