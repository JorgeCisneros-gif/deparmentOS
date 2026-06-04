// src/users/users.controller.ts
import {
  Controller, Get, Post, Patch, Body, Param,
  Query, UseGuards, Request,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiBody,
} from '@nestjs/swagger';
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

class DirectResetPasswordDto {
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

  // ── CRUD usuarios ────────────────────────────────────────────

  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crear usuario' })
  create(@Body() dto: CreateUserDto, @Request() req: any) {
    // Pasar idGrupo en vez de idAccount
    return this.svc.create(dto, req.user.role, req.user.idGrupo);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiQuery({ name: 'role', enum: UserRole, required: false })
  findAll(@Query('role') role?: UserRole, @Request() req?: any) {
    // Supervisor ve todos — administrador solo los de su grupo
    const idGrupo = req.user.role === UserRole.SUPERVISOR
      ? undefined
      : req.user.idGrupo;
    return this.svc.findAll(role, idGrupo);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Ver usuario' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/deactivate')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Desactivar usuario' })
  deactivate(@Param('id') id: string) {
    return this.svc.deactivate(id);
  }

  @Patch(':id/activate')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Reactivar usuario' })
  activate(@Param('id') id: string) {
    return this.svc.activate(id);
  }

  @Patch(':id/reset-password')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Resetear contraseña de un usuario' })
  @ApiBody({ type: DirectResetPasswordDto })
  async resetPassword(@Param('id') id: string, @Body() dto: DirectResetPasswordDto) {
    await this.svc.resetPassword(id, dto.newPassword);
    return { message: 'Contraseña actualizada correctamente' };
  }

  // ── Password reset por email (público) ───────────────────────

  @Post('request-password-reset')
  @ApiOperation({ summary: 'Solicitar reset de contraseña por email' })
  requestReset(@Body() dto: RequestResetDto) {
    return this.resetSvc.requestReset(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Confirmar reset con token' })
  resetByToken(@Body() dto: ResetPasswordDto) {
    return this.resetSvc.resetPassword(dto.token, dto.newPassword);
  }

  // ── Cambio de contraseña propio ──────────────────────────────

  @Patch('me/password')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cambiar contraseña propia' })
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.svc.changePassword(req.user.id, dto);
  }
}
