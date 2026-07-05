// src/readings/readings.controller.ts
import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, Request, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ReadingsService } from './readings.service';
import { CreateReadingDto, UpdateReadingDto, ConfirmOcrReadingDto } from './readings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SchedulerTokenGuard } from '../auth/guards/scheduler-token.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

/**
 * Endpoints del módulo de readings (mediciones).
 *
 * Convención de auth en este controller:
 *   - Endpoints HUMANOS (UI/app): JwtAuthGuard + RolesGuard
 *   - Endpoints INTERNOS (scheduler): SchedulerTokenGuard
 *
 * Los guards se aplican a NIVEL DE METHOD, no a nivel de class, porque
 * el endpoint `housekeeping` es disparado por el servicio scheduler
 * externo y no tiene JWT.
 */
@ApiTags('Readings')
@ApiBearerAuth('access-token')
@Controller('readings')
export class ReadingsController {
  constructor(private readonly svc: ReadingsService) {}

  // ════════════════════════════════════════════════════════════
  //  ENDPOINTS HUMANOS (JWT)
  // ════════════════════════════════════════════════════════════

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Registrar medición manual' })
  create(@Body() dto: CreateReadingDto) {
    return this.svc.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Listar mediciones' })
  @ApiQuery({ name: 'receiptId', required: false })
  @ApiQuery({ name: 'deptId', required: false })
  findAll(@Query('receiptId') receiptId?: string, @Query('deptId') deptId?: string) {
    return this.svc.findAll(receiptId, deptId);
  }

  @Get('history/:deptId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Historial de consumo de agua de un departamento' })
  async getHistory(@Param('deptId') deptId: string, @Request() req) {
    if (req.user.role === UserRole.PROPIETARIO && req.user.idDepartamento !== deptId) {
      throw new BadRequestException('Solo puede ver el historial de su propio departamento');
    }
    return this.svc.getConsumptionHistory(deptId, req.user.role === UserRole.SUPERVISOR);
  }

  @Get('meter-image/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Obtener filename de imagen de medidor por su ID' })
  getMeterImage(@Param('id') id: string) {
    return this.svc.getMeterImageById(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Ver medición' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Corregir medición' })
  update(@Param('id') id: string, @Body() dto: UpdateReadingDto) {
    return this.svc.update(id, dto);
  }

  // ── OCR ───────────────────────────────────────────────────

  @Post('ocr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GESTION)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '📸 Subir foto del medidor → OCR automático',
    description:
      'Procesa OCR pero NO persiste la imagen todavía. Devuelve un sessionId ' +
      'temporal (30 min) que debe usarse en POST /readings/confirm-ocr.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image', 'departamentoId', 'reciboId'],
      properties: {
        departamentoId: { type: 'string', format: 'uuid' },
        reciboId:       { type: 'string', format: 'uuid' },
        image:          { type: 'string', format: 'binary' },
        original:       { type: 'string', format: 'binary' },
      },
    },
  })
  async uploadOcr(@Request() req) {
    const fields: Record<string, string> = {};
    let fileBuffer:    Buffer | null = null;
    let originalBuffer: Buffer | null = null;
    let originalName = 'medidor.jpg';
    let mimeType     = 'image/jpeg';
    let fileSizeKb   = 0;

    try {
      const parts = req.parts();
      for await (const part of parts) {
        if (part.file) {
          const buf = await part.toBuffer();
          if (part.fieldname === 'original') {
            originalBuffer = buf;
          } else {
            fileBuffer   = buf;
            originalName = part.filename || 'medidor.jpg';
            mimeType     = part.mimetype || 'image/jpeg';
            fileSizeKb   = Math.round(buf.length / 1024);
          }
        } else {
          fields[part.fieldname] = (part.value as string)?.trim() || '';
        }
      }
    } catch (err) {
      throw new BadRequestException(`Error procesando el formulario: ${err.message}`);
    }

    const departamentoId = fields['departamentoId'] || '';
    const reciboId       = fields['reciboId']       || '';

    if (!fileBuffer || fileBuffer.length === 0) throw new BadRequestException('Se requiere una imagen (campo: image)');
    if (!departamentoId) throw new BadRequestException('departamentoId es requerido');
    if (!reciboId)       throw new BadRequestException('reciboId es requerido');

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(mimeType.toLowerCase())) {
      throw new BadRequestException('Solo se aceptan imágenes JPG, PNG o WEBP');
    }

    return this.svc.processOcrImage(
      fileBuffer,
      originalName,
      fileSizeKb,
      mimeType,
      departamentoId,
      reciboId,
      req.user.id,
      originalBuffer ?? undefined,
    );
  }

  @Post('confirm-ocr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GESTION)
  @ApiOperation({
    summary: '✅ Confirmar lectura OCR y guardar medición',
  })
  confirmOcr(@Body() body: any, @Request() req) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException(
        'El cuerpo de la petición es requerido y debe ser JSON.'
      );
    }

    const { sessionId, meterImageId, ...dto } = body;

    if (!dto.idRecibo || !dto.idDepartamento) {
      throw new BadRequestException('idRecibo e idDepartamento son requeridos');
    }
    if (dto.lecturaFinal === undefined || dto.lecturaAnterior === undefined) {
      throw new BadRequestException('lecturaFinal y lecturaAnterior son requeridos');
    }

    return this.svc.confirmOcr(
      { sessionId, meterImageId },
      dto as ConfirmOcrReadingDto,
      req.user.id,
    );
  }

  // ════════════════════════════════════════════════════════════
  //  ENDPOINTS INTERNOS (Token del scheduler)
  // ════════════════════════════════════════════════════════════

  @Post('housekeeping')
  @UseGuards(SchedulerTokenGuard)
  @ApiOperation({
    summary: '🧹 Housekeeping de fotos de medidores [Solo scheduler]',
    description:
      'Endpoint interno disparado por el servicio scheduler.\n\n' +
      'Realiza:\n' +
      '1. Reintenta uploads pendientes al Storage Gateway\n' +
      '2. Borra archivos locales que ya están confirmados en Drive\n' +
      '3. Expira fotos locales viejas (legacy)\n\n' +
      'Autenticación: header `Authorization: Bearer <SCHEDULER_API_TOKEN>` ' +
      'o `x-scheduler-token: <SCHEDULER_API_TOKEN>`.',
  })
  housekeeping() {
    return this.svc.runHousekeeping();
  }
}
