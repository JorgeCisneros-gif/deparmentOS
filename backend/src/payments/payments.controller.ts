// src/payments/payments.controller.ts
import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards, Request, BadRequestException, Patch,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePagoAutoDto, CreatePaymentDto } from './payments.dto';
import { ImageUploadService } from '../shared/image-upload.service';
import { FeesService } from '../fees/fees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly svc: PaymentsService,
    private readonly imageUpload: ImageUploadService,
    private readonly feesService: FeesService,   // ← inyectado correctamente
  ) {}

  // ── IMPORTANTE: rutas estáticas ANTES de /:id ────────────────

  // Cuotas del propietario autenticado
  @Get('my-fees')
  @Roles(UserRole.SUPERVISOR, UserRole.PROPIETARIO)  // ambos roles
  @ApiOperation({ summary: 'Cuotas del departamento del usuario autenticado' })
  @ApiQuery({ name: 'year',  required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  async getMyFees(
    @Request() req,
    @Query('year')  year?:  number,
    @Query('month') month?: number,
  ) {
    const idDepartamento = req.user.idDepartamento;
    if (!idDepartamento) throw new BadRequestException('Usuario sin departamento asignado');
    return this.feesService.findAll(idDepartamento, year ? +year : undefined, month ? +month : undefined);
  }

  // Pagos pendientes de aprobación
  @Get('pending-approval')
  @ApiOperation({ summary: 'Listar pagos pendientes de aprobación del supervisor' })
  getPendingApproval() {
    return this.svc.getPendingApproval();
  }

  // Resumen del período
  @Get('period-summary')
  @ApiOperation({ summary: 'Resumen completo del período para cobros' })
  @ApiQuery({ name: 'buildingId', required: true })
  @ApiQuery({ name: 'month', required: true, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  periodSummary(
    @Query('buildingId') buildingId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.svc.getPeriodSummary(buildingId, +month, +year);
  }

  // Saldo pendiente por edificio
  @Get('pending')
  @ApiOperation({ summary: 'Saldo pendiente por edificio y período' })
  @ApiQuery({ name: 'buildingId', required: true })
  @ApiQuery({ name: 'month', required: true, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  pending(
    @Query('buildingId') buildingId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.svc.getPendingByBuilding(buildingId, +month, +year);
  }

  // Listar pagos
  @Get()
  @ApiOperation({ summary: 'Listar pagos' })
  @ApiQuery({ name: 'feeId', required: false })
  @ApiQuery({ name: 'ownerId', required: false })
  findAll(@Query('feeId') feeId?: string, @Query('ownerId') ownerId?: string) {
    return this.svc.findAll(feeId, ownerId);
  }

  // ── POST ──────────────────────────────────────────────────────

  // Registrar pago (supervisor)
  @Post()
  @ApiOperation({ summary: 'Registrar pago de una cuota' })
  create(@Body() dto: CreatePaymentDto) {
    return this.svc.create(dto);
  }

  // Propietario registra pago → queda pendiente_aprobacion
  @Post('propietario')
  @Roles(UserRole.SUPERVISOR, UserRole.PROPIETARIO)
  @ApiOperation({ summary: 'Propietario registra pago (queda pendiente de aprobación)' })
  createPropietario(@Body() dto: CreatePagoAutoDto, @Request() req) {
    // idPropietario puede ser null si el usuario no tiene propietario vinculado;
    // en ese caso lo guardamos como null (el campo es nullable en BD).
    // NUNCA usar req.user.id como fallback — es un UUID de "users", no de "propietarios",
    // y viola la foreign key constraint "pagos_id_propietario_fkey".
    const idPropietario = req.user.idPropietario ?? null;
    return this.svc.createPropietario(dto, idPropietario);
  }

  // ── Rutas con :id AL FINAL ────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Ver pago' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  // Subir comprobante base64
  @Post(':id/comprobante')
  @Roles(UserRole.SUPERVISOR, UserRole.PROPIETARIO)
  @ApiOperation({ summary: 'Subir imagen de comprobante en base64' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        base64:   { type: 'string' },
        filename: { type: 'string' },
      },
      required: ['base64', 'filename'],
    },
  })
  async uploadComprobante(
    @Param('id') id: string,
    @Body() body: { base64: string; filename: string },
  ) {
    const filepath = this.imageUpload.saveBase64(
      body.base64, body.filename, `comprobante_${id}`, { subdir: 'comprobantes' },
    );
    // Convertir path del filesystem a URL relativa para servir estáticamente
    // './uploads/comprobantes/file.jpg' → '/uploads/comprobantes/file.jpg'
    const urlPath = '/' + filepath.replace(/^\.?\//, '').replace(/\\/g, '/');
    return this.svc.updateComprobanteUrl(id, urlPath);
  }

  // Supervisor aprueba pago pendiente
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Supervisor aprueba un pago pendiente' })
  approve(@Param('id') id: string, @Request() req) {
    return this.svc.approvePayment(id, req.user.id);
  }

  // Supervisor rechaza pago pendiente
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Supervisor rechaza un pago pendiente' })
  reject(@Param('id') id: string, @Request() req) {
    return this.svc.rejectPayment(id, req.user.id);
  }
}
