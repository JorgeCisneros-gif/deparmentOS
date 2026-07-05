// src/payments/payments.controller.ts
import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards, Request, Response, BadRequestException, Patch, NotFoundException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import { PaymentsService } from './payments.service';
import { CreatePagoAutoDto, CreatePaymentDto } from './payments.dto';
import { ImageUploadService } from '../shared/image-upload.service';
import { FeesService } from '../fees/fees.service';
import { StorageGatewayService } from '../storage-gateway/storage-gateway.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SchedulerTokenGuard } from '../auth/guards/scheduler-token.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly svc: PaymentsService,
    private readonly imageUpload: ImageUploadService,
    private readonly feesService: FeesService,
    private readonly storageGateway: StorageGatewayService,
  ) {}

  // ════════════════════════════════════════════════════════════
  //  HOUSEKEEPING (scheduler only)
  // ════════════════════════════════════════════════════════════

  @Post('housekeeping')
  @UseGuards(SchedulerTokenGuard)
  @ApiOperation({
    summary: '🧹 Housekeeping de comprobantes de pago [Solo scheduler]',
  })
  housekeeping() {
    return this.svc.runHousekeeping();
  }

  // ════════════════════════════════════════════════════════════
  //  ENDPOINTS HUMANOS (JWT) — rutas estáticas primero
  // ════════════════════════════════════════════════════════════

  @Get('my-fees')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERVISOR, UserRole.PROPIETARIO)
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

  @Get('pending-approval')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Listar pagos pendientes de aprobación del supervisor' })
  getPendingApproval() {
    return this.svc.getPendingApproval();
  }

  @Get('period-summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GESTION)
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

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GESTION)
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

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Listar pagos' })
  @ApiQuery({ name: 'feeId', required: false })
  @ApiQuery({ name: 'ownerId', required: false })
  findAll(@Query('feeId') feeId?: string, @Query('ownerId') ownerId?: string) {
    return this.svc.findAll(feeId, ownerId);
  }

  // ════════════════════════════════════════════════════════════
  //  COMPROBANTES (vouchers) — endpoints con paths fijos
  // ════════════════════════════════════════════════════════════

  /**
   * Sirve los bytes del comprobante. Decide entre local y Drive según
   * el storage_provider del voucher.
   *
   * Funciona igual que /readings/meter-image/:id/content pero para
   * comprobantes de pago.
   */
  @Get('voucher/:id/content')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Sirve los bytes del comprobante (local o Drive)' })
  async getVoucherContent(
    @Param('id') id: string,
    @Response({ passthrough: false }) reply: any,
  ) {
    const voucher = await this.svc.getVoucherById(id);
    if (!voucher) throw new NotFoundException('Comprobante no encontrado');

    // ─── Caso 1: archivo local ──
    if (voucher.storageProvider === 'local' && voucher.filepath) {
      if (!fs.existsSync(voucher.filepath)) {
        this.logger.warn(`Archivo local no existe: ${voucher.filepath}`);
        throw new NotFoundException('Archivo no disponible en el servidor');
      }
      const buffer = fs.readFileSync(voucher.filepath);
      const contentType = voucher.mimeType || this.guessMimeType(voucher.filename);
      reply
        .header('content-type', contentType)
        .header('cache-control', 'private, max-age=3600')
        .header('content-disposition', `inline; filename="${voucher.filename}"`)
        .send(buffer);
      return;
    }

    // ─── Caso 2: archivo en Drive ──
    if (voucher.storageProvider === 'google_drive') {
      const ctx = await this.svc.resolveOrgIdForVoucher(id);
      if (!ctx) throw new NotFoundException('No se pudo resolver el contexto');

      const fileId = await this.svc.getGatewayFileId(id);
      if (!fileId) throw new NotFoundException('Comprobante sin file_id en el gateway');

      try {
        const file = await this.storageGateway.downloadFileBytes(fileId, ctx.idGrupo);
        reply
          .header('content-type', file.contentType)
          .header('cache-control', 'private, max-age=3600')
          .header('content-disposition', `inline; filename="${file.fileName || voucher.filename}"`)
          .send(file.buffer);
        return;
      } catch (err: any) {
        this.logger.error(`Error sirviendo voucher ${id} desde Drive: ${err.message}`);
        // Fallback al archivo local si todavía existe
        if (voucher.filepath && fs.existsSync(voucher.filepath)) {
          const buffer = fs.readFileSync(voucher.filepath);
          reply
            .header('content-type', voucher.mimeType || 'image/jpeg')
            .send(buffer);
          return;
        }
        throw new NotFoundException('No se pudo cargar el comprobante');
      }
    }

    throw new NotFoundException('Comprobante no disponible');
  }

  // ════════════════════════════════════════════════════════════
  //  POST
  // ════════════════════════════════════════════════════════════

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Registrar pago de una cuota' })
  create(@Body() dto: CreatePaymentDto) {
    return this.svc.create(dto);
  }

  @Post('propietario')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERVISOR, UserRole.PROPIETARIO)
  @ApiOperation({ summary: 'Propietario registra pago (queda pendiente de aprobación)' })
  createPropietario(@Body() dto: CreatePagoAutoDto, @Request() req) {
    const idPropietario = req.user.idPropietario ?? null;
    return this.svc.createPropietario(dto, idPropietario);
  }

  // ════════════════════════════════════════════════════════════
  //  Rutas con :id AL FINAL
  // ════════════════════════════════════════════════════════════

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Ver pago' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  /**
   * Sube un comprobante (base64) para un pago.
   *
   * Crea un voucher en payment_vouchers, intenta subir al Drive,
   * actualiza pagos.comprobante_url (legacy).
   *
   * Roles: supervisor o propietario.
   */
  @Post(':id/comprobante')
  @UseGuards(JwtAuthGuard, RolesGuard)
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
    @Request() req,
  ) {
    const voucher = await this.svc.uploadVoucher({
      paymentId:  id,
      base64:     body.base64,
      filename:   body.filename,
      uploadedBy: req.user.id,
    });
    return {
      voucherId:       voucher.id,
      storageProvider: voucher.storageProvider,
      filename:        voucher.filename,
    };
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Supervisor aprueba un pago pendiente' })
  approve(@Param('id') id: string, @Request() req) {
    return this.svc.approvePayment(id, req.user.id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Supervisor rechaza un pago pendiente' })
  reject(@Param('id') id: string, @Request() req) {
    return this.svc.rejectPayment(id, req.user.id);
  }

  // ── Helpers ──

  private guessMimeType(filename: string): string {
    const ext = (filename || '').toLowerCase().split('.').pop() || '';
    if (ext === 'png')  return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'gif')  return 'image/gif';
    return 'image/jpeg';
  }
}
