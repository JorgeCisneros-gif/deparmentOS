// src/notifications/notifications.controller.ts
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { NotificationsService, UpdateFeeForMessageDto } from './notifications.service';
import { CustomVariable } from './message-template.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERVISOR)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  // ── Variables ─────────────────────────────────────────────────

  // IMPORTANTE: rutas estáticas ANTES de rutas con parámetros

  @Get('template/variables/list')
  @ApiOperation({ summary: 'Listar variables del sistema y de servicios' })
  getSystemVars() {
    return { sistema: this.svc.getSystemVariables(), servicios: this.svc.getServiceVariables() };
  }

  @Get('template/variables/all/:buildingId')
  @ApiOperation({ summary: 'Listar todas las variables (sistema + servicios + personalizadas)' })
  getAllVars(@Param('buildingId') buildingId: string) {
    return this.svc.getAllVariables(buildingId);
  }

  // ── Variables personalizadas ──────────────────────────────────

  @Get('template/custom-vars/:buildingId')
  @ApiOperation({ summary: 'Obtener variables personalizadas del edificio' })
  getCustomVars(@Param('buildingId') buildingId: string) {
    return this.svc.getCustomVariables(buildingId);
  }

  @Patch('template/custom-vars/:buildingId')
  @ApiOperation({ summary: 'Guardar variables personalizadas del edificio' })
  saveCustomVars(
    @Param('buildingId') buildingId: string,
    @Body() body: { variables: CustomVariable[] },
  ) {
    return this.svc.saveCustomVariables(buildingId, body.variables);
  }

  // ── Plantilla ─────────────────────────────────────────────────

  @Get('template/:buildingId')
  @ApiOperation({ summary: 'Obtener plantilla del edificio' })
  getTemplate(@Param('buildingId') buildingId: string) {
    return this.svc.getTemplate(buildingId);
  }

  @Patch('template/:buildingId')
  @ApiOperation({ summary: 'Guardar plantilla del edificio' })
  saveTemplate(
    @Param('buildingId') buildingId: string,
    @Body() body: { templateText: string; nombre?: string },
  ) {
    return this.svc.saveTemplate(buildingId, body.templateText, body.nombre);
  }

  @Post('template/:buildingId/reset')
  @ApiOperation({ summary: 'Restablecer plantilla por defecto' })
  resetTemplate(@Param('buildingId') buildingId: string) {
    return this.svc.resetTemplate(buildingId);
  }

  // ── Editar cuota ──────────────────────────────────────────────

  @Patch('fee/:feeId')
  @ApiOperation({ summary: 'Editar montos/fecha de vencimiento antes de enviar mensaje' })
  updateFee(@Param('feeId') feeId: string, @Body() dto: UpdateFeeForMessageDto) {
    return this.svc.updateFeeForMessage(feeId, dto);
  }

  // ── Mensajes ──────────────────────────────────────────────────

  @Get('message/:feeId')
  @ApiOperation({ summary: 'Generar mensaje para un departamento' })
  getMessage(@Param('feeId') feeId: string) {
    return this.svc.generateMessageForFee(feeId);
  }

  @Get('messages/period')
  @ApiOperation({ summary: 'Generar mensajes para todos los deptos del período' })
  @ApiQuery({ name: 'buildingId', required: true })
  @ApiQuery({ name: 'month', required: true, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  getMessagesPeriod(
    @Query('buildingId') buildingId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.svc.generateMessagesForPeriod(buildingId, +month, +year);
  }

  // ── Confirmar envío ───────────────────────────────────────────

  @Post('confirm/:feeId')
@ApiOperation({ summary: 'Confirmar envío del mensaje al propietario' })
confirmOne(
  @Param('feeId') feeId: string,
  @Request() req,
  @Body() body?: { fechaMensajeEnviado?: string },
) {
  return this.svc.confirmMessageSent(feeId, req.user.id, body?.fechaMensajeEnviado);
}

  @Post('confirm-all')
  @ApiQuery({ name: 'buildingId', required: true })
  @ApiQuery({ name: 'month', required: true, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  confirmAll(
    @Query('buildingId') buildingId: string,
    @Query('month') month: number,
    @Query('year') year: number,
    @Request() req,
  ) {
    return this.svc.confirmAllMessagesSent(buildingId, +month, +year, req.user.id);
  }
}
