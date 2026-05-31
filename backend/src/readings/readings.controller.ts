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
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Readings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('readings')
export class ReadingsController {
  constructor(private readonly svc: ReadingsService) {}

  @Post()
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Registrar medición manual' })
  create(@Body() dto: CreateReadingDto) {
    return this.svc.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar mediciones' })
  @ApiQuery({ name: 'receiptId', required: false })
  @ApiQuery({ name: 'deptId', required: false })
  findAll(@Query('receiptId') receiptId?: string, @Query('deptId') deptId?: string) {
    return this.svc.findAll(receiptId, deptId);
  }

  // ── IMPORTANTE: rutas estáticas ANTES de /:id ──────────────

  @Get('history/:deptId')
  @ApiOperation({ summary: 'Historial de consumo de agua de un departamento' })
  async getHistory(@Param('deptId') deptId: string, @Request() req) {
    if (req.user.role === UserRole.PROPIETARIO && req.user.idDepartamento !== deptId) {
      throw new BadRequestException('Solo puede ver el historial de su propio departamento');
    }
    return this.svc.getConsumptionHistory(deptId, req.user.role === UserRole.SUPERVISOR);
  }

  // Devuelve el filename de una imagen de medidor para construir la URL en el frontend
  @Get('meter-image/:id')
  @ApiOperation({ summary: 'Obtener filename de imagen de medidor por su ID' })
  getMeterImage(@Param('id') id: string) {
    return this.svc.getMeterImageById(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver medición' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Corregir medición' })
  update(@Param('id') id: string, @Body() dto: UpdateReadingDto) {
    return this.svc.update(id, dto);
  }

  // ── OCR ───────────────────────────────────────────────────

  @Post('ocr')
  @Roles(UserRole.GESTION)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '📸 Subir foto del medidor → OCR automático' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image', 'departamentoId', 'reciboId'],
      properties: {
        departamentoId: { type: 'string', format: 'uuid' },
        reciboId:       { type: 'string', format: 'uuid' },
        image:          { type: 'string', format: 'binary', description: 'Imagen procesada para OCR' },
        original:       { type: 'string', format: 'binary', description: 'Imagen original para guardar (opcional)' },
      },
    },
  })
  async uploadOcr(@Request() req) {
    const fields: Record<string, string> = {};
    let fileBuffer:    Buffer | null = null;   // procesada → OCR
    let originalBuffer: Buffer | null = null;  // original → guardar en BD
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
            // campo 'image' o cualquier otro archivo
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
      departamentoId,
      reciboId,
      req.user.id,
      originalBuffer ?? undefined,   // original para guardar (puede ser undefined)
    );
  }

  @Post('confirm-ocr')
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: '✅ Confirmar lectura OCR y guardar medición' })
  confirmOcr(@Body() body: { meterImageId: string } & ConfirmOcrReadingDto, @Request() req) {
    const { meterImageId, ...dto } = body;
    return this.svc.confirmOcr(meterImageId, dto, req.user.id);
  }

  @Post('housekeeping')
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Eliminar imágenes de medidores vencidas' })
  housekeeping() {
    return this.svc.runHousekeeping();
  }
}
