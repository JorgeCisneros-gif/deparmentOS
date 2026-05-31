import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, Req, Logger,
  HttpException, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { GastosService } from './gastos.service';
import { CreateGastoDto, UpdateGastoDto, CreatePagoGastoDto } from './gastos.dto';
import { ImageUploadService } from '../shared/image-upload.service';

@ApiTags('gastos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gastos')
export class GastosController {
  private readonly logger = new Logger(GastosController.name);

  constructor(
    private readonly svc: GastosService,
    private readonly imgSvc: ImageUploadService,
  ) {}

  // ── GASTOS ────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar gastos extras de un edificio' })
  @ApiQuery({ name: 'buildingId', required: true })
  @ApiQuery({ name: 'estado', required: false })
  findAll(
    @Query('buildingId') buildingId: string,
    @Query('estado')     estado?: string,
  ) {
    return this.svc.findAll(buildingId, estado);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un gasto con pagos y estado por depto' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Crear nuevo gasto extra' })
  async create(@Body() dto: CreateGastoDto) {
    this.logger.log(`[POST /gastos] body recibido: ${JSON.stringify(dto)}`);
    try {
      const result = await this.svc.create(dto);
      this.logger.log(`[POST /gastos] gasto creado id=${result.id}`);
      return result;
    } catch (err) {
      this.logger.error(`[POST /gastos] ERROR: ${err?.message}`, err?.stack);
      throw new HttpException(
        { message: err?.message || 'Error creando gasto', detail: err?.detail || null },
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Editar gasto extra' })
  async update(@Param('id') id: string, @Body() dto: UpdateGastoDto) {
    this.logger.log(`[PATCH /gastos/${id}] body: ${JSON.stringify(dto)}`);
    try {
      return await this.svc.update(id, dto);
    } catch (err) {
      this.logger.error(`[PATCH /gastos/${id}] ERROR: ${err?.message}`, err?.stack);
      throw new HttpException(
        { message: err?.message || 'Error actualizando gasto' },
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/cerrar')
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Cerrar un gasto' })
  cerrar(@Param('id') id: string) {
    return this.svc.cerrar(id);
  }

  @Patch(':id/anular')
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Anular un gasto' })
  anular(@Param('id') id: string) {
    return this.svc.anular(id);
  }

  // ── PAGOS ─────────────────────────────────────────────────────

  @Get(':id/pagos')
  @ApiOperation({ summary: 'Pagos registrados de un gasto' })
  getPagos(@Param('id') id: string) {
    return this.svc.getPagos(id);
  }

  @Post('pagos')
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Registrar pago de gasto extra' })
  async registrarPago(@Req() req: any) {
    this.logger.log(`[POST /gastos/pagos] content-type: ${req.headers['content-type']}`);
    let dto: CreatePagoGastoDto;
    let comprobanteUrl: string | undefined;

    const contentType: string = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      try {
        const { fields, image } = await this.imgSvc.parseMultipart(req, {
          subdir: 'comprobantes', maxSizeMb: 5,
        });
        dto = {
          idGastoExtra:   fields.idGastoExtra,
          idDepartamento: fields.idDepartamento,
          fechaPago:      fields.fechaPago,
          monto:          parseFloat(fields.monto),
          tipoPago:       fields.tipoPago as any,
          banco:          fields.banco as any,
          referencia:     fields.referencia,
          observacion:    fields.observacion,
        };
        if (image) {
          const filepath = this.imgSvc.saveBuffer(
            image.buffer, image.filename, 'comprobante', { subdir: 'comprobantes' },
          );
          comprobanteUrl = `/uploads/comprobantes/${filepath.split(/[/\\]/).pop()}`;
        }
      } catch (err) {
        this.logger.error(`[POST /gastos/pagos] multipart error: ${err?.message}`);
        throw new HttpException({ message: err?.message }, HttpStatus.BAD_REQUEST);
      }
    } else {
      dto = req.body;
      this.logger.log(`[POST /gastos/pagos] JSON body: ${JSON.stringify(dto)}`);
    }

    try {
      return await this.svc.registrarPago(dto, comprobanteUrl);
    } catch (err) {
      this.logger.error(`[POST /gastos/pagos] ERROR: ${err?.message}`, err?.stack);
      throw new HttpException(
        { message: err?.message || 'Error registrando pago' },
        err?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('pagos/:id')
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Eliminar un pago de gasto extra' })
  deletePago(@Param('id') id: string) {
    return this.svc.deletePago(id);
  }

  @Post('pagos/:id/comprobante')
@Roles(UserRole.GESTION)
async uploadComprobante(
  @Param('id') id: string,
  @Body() body: { base64: string; filename: string },
) {
  const filepath = this.imgSvc.saveBase64(         // ← imgSvc
    body.base64, body.filename, `comprobante_gasto_${id}`,
    { subdir: 'comprobantes' },
  );
  return this.svc.updatePagoComprobante(id, filepath);  // ← svc
}

}
