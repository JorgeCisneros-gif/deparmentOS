// src/accounts/accounts.controller.ts
// LEGACY — La gestión principal ahora es a través de /grupos
// Este controller se mantiene solo para compatibilidad
import {
  Controller, Get, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Accounts (Legacy)')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly svc: AccountsService) {}

  @Get()
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Listar cuentas (legacy)' })
  findAll() { return this.svc.findAll(); }
}
