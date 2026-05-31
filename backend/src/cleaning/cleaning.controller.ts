import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CleaningService } from './cleaning.service';
import {
  CreateProviderDto, UpdateProviderDto,
  CreateAreaDto, UpdateAreaDto,
  CreateCleaningRecordDto, UpdateCleaningRecordDto,
  ConfirmProviderPaymentDto,
} from './cleaning.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Cleaning')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.GESTION)
@Controller('cleaning')
export class CleaningController {
  constructor(private readonly svc: CleaningService) {}

  // ── PROVEEDORES ───────────────────────────────────────────────

  @Post('providers')
  @ApiOperation({ summary: 'Registrar proveedor de limpieza (persona que limpia)' })
  createProvider(@Body() dto: CreateProviderDto) { return this.svc.createProvider(dto); }

  @Get('providers')
  @ApiOperation({ summary: 'Listar proveedores del edificio' })
  @ApiQuery({ name: 'buildingId', required: true })
  findProviders(@Query('buildingId') buildingId: string) {
    return this.svc.findProviders(buildingId);
  }

  @Get('providers/:id')
  @ApiOperation({ summary: 'Ver proveedor' })
  findProvider(@Param('id') id: string) { return this.svc.findProvider(id); }

  @Patch('providers/:id')
  @ApiOperation({
    summary: 'Actualizar proveedor',
    description: 'Actualiza datos del proveedor: nombre, cuenta bancaria, costo por día, etc.',
  })
  updateProvider(@Param('id') id: string, @Body() dto: UpdateProviderDto) {
    return this.svc.updateProvider(id, dto);
  }

  @Patch('providers/:id/deactivate')
  @ApiOperation({ summary: 'Desactivar proveedor' })
  deactivateProvider(@Param('id') id: string) { return this.svc.deactivateProvider(id); }

  // ── AMBIENTES ─────────────────────────────────────────────────

  @Post('areas')
  @ApiOperation({
    summary: 'Registrar ambiente de limpieza',
    description: 'Ej: Lobby, Cochera, Escaleras. Cada edificio puede tener sus propios ambientes con costos distintos.',
  })
  createArea(@Body() dto: CreateAreaDto) { return this.svc.createArea(dto); }

  @Get('areas')
  @ApiOperation({ summary: 'Listar ambientes del edificio' })
  @ApiQuery({ name: 'buildingId', required: true })
  findAreas(@Query('buildingId') buildingId: string) { return this.svc.findAreas(buildingId); }

  @Get('areas/:id')
  @ApiOperation({ summary: 'Ver ambiente' })
  findArea(@Param('id') id: string) { return this.svc.findArea(id); }

  @Patch('areas/:id')
  @ApiOperation({ summary: 'Actualizar ambiente (nombre, costo extra, orden)' })
  updateArea(@Param('id') id: string, @Body() dto: UpdateAreaDto) {
    return this.svc.updateArea(id, dto);
  }

  // ── REGISTROS MENSUALES ───────────────────────────────────────

  @Post('records')
  @ApiOperation({
    summary: 'Registrar limpieza mensual',
    description: `
Registra los días trabajados y ambientes limpiados del mes.  
El costo total se calcula automáticamente:  
**costo_total = (días × costo_por_día) + suma(costos_extra_ambientes)**

El detalle de días es opcional — sirve para auditoría si se quiere registrar qué días exactos se limpió.
    `,
  })
  createRecord(@Body() dto: CreateCleaningRecordDto) { return this.svc.createRecord(dto); }

  @Get('records')
  @ApiOperation({ summary: 'Listar registros de limpieza del edificio' })
  @ApiQuery({ name: 'buildingId', required: true })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  findRecords(
    @Query('buildingId') buildingId: string,
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) { return this.svc.findRecords(buildingId, year, month); }

  @Get('records/:id')
  @ApiOperation({ summary: 'Ver registro de limpieza con detalle de costos' })
  findRecord(@Param('id') id: string) { return this.svc.findRecord(id); }

  @Patch('records/:id')
  @ApiOperation({
    summary: 'Actualizar registro mensual',
    description: 'Permite corregir días trabajados, ambientes o marcar el pago al proveedor.',
  })
  updateRecord(@Param('id') id: string, @Body() dto: UpdateCleaningRecordDto) {
    return this.svc.updateRecord(id, dto);
  }

  // ── PAGO AL PROVEEDOR ─────────────────────────────────────────

  @Post('records/:id/pay-provider')
  @ApiOperation({
    summary: '💰 Confirmar pago al proveedor de limpieza',
    description: `
Registra que se pagó al proveedor directamente.  
**Este pago es independiente del cobro a los propietarios.**  
El cobro a los propietarios se gestiona por separado con el mensaje de limpieza.
    `,
  })
  confirmProviderPayment(
    @Param('id') id: string,
    @Body() dto: ConfirmProviderPaymentDto,
  ) { return this.svc.confirmProviderPayment(id, dto); }

  // ── MENSAJE DE COBRO ──────────────────────────────────────────

  @Get('records/:id/message')
  @ApiOperation({
    summary: '📱 Generar mensaje de cobro de limpieza para los propietarios',
    description: `
Genera el mensaje específico de limpieza con:
- Días trabajados y ambientes
- Cuota por departamento (monto_total ÷ nro deptos)
- **Datos de pago del proveedor** (no del edificio)

⚠️ Este mensaje es **diferente** al de agua/luz/internet:  
el pago va directo al proveedor por su cuenta bancaria o Yape/Plin.
    `,
  })
  @ApiQuery({ name: 'buildingId', required: true })
  getMessage(
    @Param('id') id: string,
    @Query('buildingId') buildingId: string,
  ) { return this.svc.generateCleaningMessage(id, buildingId); }

  @Post('records/:id/confirm-message')
  @ApiOperation({ summary: '✅ Confirmar que se envió el mensaje de limpieza' })
  confirmMessage(@Param('id') id: string, @Request() req) {
    return this.svc.confirmCleaningMessageSent(id, req.user.id);
  }
}
