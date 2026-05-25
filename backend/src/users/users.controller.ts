// src/users/users.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { UsersService } from './users.service';
import { PasswordResetService } from './password-reset.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './user.entity';

class RequestResetDto {
  @IsEmail()
  email: string;
}

class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly svc: UsersService,
    private readonly resetSvc: PasswordResetService,
  ) {}

  // ── CRUD usuarios (requiere auth + supervisor) ─────────────

  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Crear usuario' })
  create(@Body() dto: CreateUserDto) {
    return this.svc.create(dto);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiQuery({ name: 'role', enum: UserRole, required: false })
  findAll(@Query('role') role?: UserRole) {
    return this.svc.findAll(role);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Ver usuario' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/deactivate')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Desactivar usuario' })
  deactivate(@Param('id') id: string) {
    return this.svc.deactivate(id);
  }

  @Patch(':id/activate')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Reactivar usuario' })
  activate(@Param('id') id: string) {
    return this.svc.update(id, { isActive: true });
  }

  // ── Cambio de contraseña (usuario autenticado) ─────────────

  @Patch('me/change-password')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cambiar mi contraseña (usuario autenticado)' })
  changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.svc.changePassword(req.user.id, dto);
  }

  // ── Reset de contraseña (rutas públicas — sin auth) ────────

  // IMPORTANTE: estas rutas van ANTES de /:id para evitar conflictos

  @Post('reset/request')
  @ApiOperation({
    summary: 'Solicitar reset de contraseña',
    description: `
Envía instrucciones según RESET_NOTIFICATION en .env:
- email     → envía correo vía SMTP
- whatsapp  → devuelve URL de WhatsApp para copiar/enviar
- both      → ambos
    `,
  })
  requestReset(@Body() dto: RequestResetDto) {
    return this.resetSvc.requestReset(dto.email);
  }

  @Get('reset/validate')
  @ApiOperation({ summary: 'Validar token de reset (el frontend lo llama al cargar la página)' })
  @ApiQuery({ name: 'token', required: true })
  validateToken(@Query('token') token: string) {
    return this.resetSvc.validateToken(token);
  }

  @Post('reset/confirm')
  @ApiOperation({ summary: 'Aplicar nueva contraseña con el token de reset' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.resetSvc.resetPassword(dto.token, dto.newPassword);
  }
}
