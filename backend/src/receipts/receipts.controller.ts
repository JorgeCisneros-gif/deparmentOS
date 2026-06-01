// src/receipts/receipts.controller.ts
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto, UpdateReceiptDto } from './receipts.dto';
import { Service } from '../services/service.entity';
import { Building } from '../buildings/building.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

const TIPO_META: Record<string, { icon: string; color: string; descripcion: string }> = {
  agua:          { icon: 'Droplets',    color: 'var(--blue)',    descripcion: 'Factura mensual de agua. Ingresa el monto total y los m³ totales según la factura.' },
  luz:           { icon: 'Zap',         color: 'var(--accent)',  descripcion: 'Factura de electricidad. Se divide en partes iguales entre los departamentos activos.' },
  internet:      { icon: 'Wifi',        color: 'var(--green)',   descripcion: 'Internet para cámaras. Valor por defecto: S/. 30.00. Modifica solo si el costo varió.' },
  limpieza:      { icon: 'Brush',       color: '#a78bfa',        descripcion: 'Costo mensual de limpieza. Se divide en partes iguales entre los departamentos.' },
  mantenimiento: { icon: 'Wrench',      color: '#fb923c',        descripcion: 'Gastos de mantenimiento del edificio. Se divide en partes iguales.' },
  otro:          { icon: 'ReceiptText', color: '#94a3b8',        descripcion: 'Gasto adicional del edificio. Se divide en partes iguales entre los departamentos.' },
}

@ApiTags('Receipts')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(
    private readonly svc: ReceiptsService,
    @InjectRepository(Service)  private readonly serviceRepo: Repository<Service>,
    @InjectRepository(Building) private readonly buildingRepo: Repository<Building>,
  ) {}

  @Post()
  @Roles(UserRole.GESTION)
  create(@Body() dto: CreateReceiptDto) { return this.svc.create(dto); }


@Get('recalcular-factor/:reciboId')
@ApiOperation({
  summary: 'Recalcula el factor de ajuste sumando mediciones del período',
  description: `
  Suma los m³/kWh medidos en todos los departamentos para el período del recibo,
  calcula factor = totalUnidadesFactura / suma_mediciones y lo guarda en el recibo.
  `,
})
@ApiQuery({ name: 'save', required: false, type: Boolean, description: 'Si true, guarda el factor calculado' })
async recalcularFactor(
  @Param('reciboId') reciboId: string,
  @Query('save') save?: string,
) {
  return this.svc.recalcularFactor(reciboId, save === 'true');
}
 



  @Patch(':id')
  @Roles(UserRole.GESTION)
  update(@Param('id') id: string, @Body() dto: UpdateReceiptDto) { return this.svc.update(id, dto); }

  @Get('validate-period')
  @Roles(UserRole.GESTION)
  @ApiQuery({ name: 'buildingId', required: true })
  @ApiQuery({ name: 'month', required: true, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  validatePeriod(
    @Query('buildingId') buildingId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.svc.validatePeriodReceipts(buildingId, +month, +year);
  }

  // ── GET /receipts/period ──────────────────────────────────────
  // Filtra por edificio.serviciosActivos[tipo] === true
  // No depende de servicios.activo para el control por edificio

  @Get('period')
  @Roles(UserRole.GESTION)
  @ApiQuery({ name: 'buildingId', required: true })
  @ApiQuery({ name: 'month', required: true, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  async getPeriodReceipts(
    @Query('buildingId') buildingId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    // Cargar edificio con su mapa de servicios habilitados
    const building = await this.buildingRepo.findOne({ where: { id: buildingId } });
    if (!building) return { periodoMes: +month, periodoAnio: +year, listo: false, serviciosItems: [], servicios: {} };

    const serviciosMap: Record<string, boolean> = building.serviciosActivos || { agua: true, luz: true, internet: true };

    // Keys habilitadas (pueden ser UUIDs o tipos)
    const enabledKeys = Object.entries(serviciosMap)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);

    if (!enabledKeys.length) {
      return { periodoMes: +month, periodoAnio: +year, listo: false, serviciosItems: [], servicios: {} };
    }

    // Todos los servicios del edificio (activos globalmente)
    const allServices = await this.serviceRepo.find({
      where: { idEdificio: buildingId, activo: true },
      order: { tipo: 'ASC' },
    });

    // Detectar formato: UUID o tipo directo
    const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(s);
    const usingUuids = enabledKeys.length > 0 && isUuid(enabledKeys[0]);

    // Filtrar servicios habilitados según el formato
    const enabledServices = usingUuids
      ? allServices.filter(s => serviciosMap[s.id] === true)        // nuevo: por UUID
      : allServices.filter(s => serviciosMap[s.tipo] === true);     // antiguo: por tipo

    // Recibos del período
    const allReceipts = await this.svc.findAll(undefined, +year, +month);
    const receiptBySvcId: Record<string, any> = {};
    for (const r of allReceipts) {
      if (enabledServices.find(s => s.id === r.idServicio)) receiptBySvcId[r.idServicio] = r;
    }

    const serviciosItems = enabledServices.map(svc => {
      const recibo = receiptBySvcId[svc.id] || null;
      const meta   = TIPO_META[svc.tipo] || TIPO_META['otro'];
      return {
        tipo:        svc.tipo,
        servicio:    svc,
        recibo,
        cargado:     !!recibo,
        icon:        meta.icon,
        color:       meta.color,
        titulo:      svc.nombreServicio || svc.tipo,
        descripcion: meta.descripcion,
      };
    });

    const listo = serviciosItems.every(i => i.cargado);
    const byTipo: Record<string, any>    = {};
    const svcByTipo: Record<string, any> = {};
    for (const item of serviciosItems) {
      byTipo[item.tipo]    = item.recibo;
      svcByTipo[item.tipo] = item.servicio;
    }

    return {
      periodoMes: +month, periodoAnio: +year, listo, serviciosItems,
      agua:     byTipo['agua']     || null,
      luz:      byTipo['luz']      || null,
      internet: byTipo['internet'] || null,
      limpieza: byTipo['limpieza'] || null,
      servicios: svcByTipo,
    };
  }

  @Get()
  @ApiQuery({ name: 'serviceId', required: false })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  findAll(@Query('serviceId') serviceId?: string, @Query('year') year?: number, @Query('month') month?: number) {
    return this.svc.findAll(serviceId, year ? +year : undefined, month ? +month : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }
}
