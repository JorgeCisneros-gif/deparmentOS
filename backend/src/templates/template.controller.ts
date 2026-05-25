import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam,
} from '@nestjs/swagger';
import { TemplateService } from './template.service';
import {
  CreateTemplateDto, UpdateTemplateDto,
  RenderTemplateDto, RenderAllDto,
} from './template.dto';
import { TemplateTipo } from './template.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Templates')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('templates')
export class TemplateController {
  constructor(private readonly svc: TemplateService) {}

  // ── CRUD ──────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Crear plantilla de mensaje personalizada',
    description: `
Crea una plantilla con variables entre dobles llaves que se reemplazan automáticamente.

**Ejemplo de cuerpo:**
\`\`\`
Hola {{propietario}} (Depto {{depto}}), su cuota de {{periodo}} es S/. {{monto_total}}.
Consumo de agua: {{m3}} m³ a S/. {{precio_m3}} por m³.
Vence el {{fecha_vencimiento}}.
\`\`\`

Si \`esDefault: true\`, esta plantilla se usará automáticamente para el tipo indicado.
    `,
  })
  create(@Body() dto: CreateTemplateDto, @Request() req) {
    return this.svc.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar plantillas del edificio' })
  @ApiQuery({ name: 'buildingId', required: true })
  @ApiQuery({ name: 'tipo', required: false, enum: TemplateTipo })
  findAll(
    @Query('buildingId') buildingId: string,
    @Query('tipo') tipo?: TemplateTipo,
  ) {
    return this.svc.findAll(buildingId, tipo);
  }

  @Get('variables')
  @ApiOperation({
    summary: '📋 Ver todas las variables disponibles por tipo de plantilla',
    description: 'Devuelve la lista de variables que se pueden usar en cada tipo de plantilla.',
  })
  @ApiQuery({ name: 'tipo', required: false, enum: TemplateTipo })
  getVariables(@Query('tipo') tipo?: TemplateTipo) {
    return this.svc.getVariables(tipo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver plantilla' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Get(':id/preview')
  @ApiOperation({
    summary: '👁️ Previsualizar plantilla con datos de ejemplo',
    description: 'Renderiza la plantilla con valores ficticios para que el supervisor vea cómo quedará el mensaje antes de enviarlo.',
  })
  preview(@Param('id') id: string) { return this.svc.preview(id); }

  @Patch(':id')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar plantilla' })
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Desactivar plantilla' })
  deactivate(@Param('id') id: string) { return this.svc.deactivate(id); }

  // ── Renderizado ───────────────────────────────────────────────

  @Post('render/one')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({
    summary: '📱 Renderizar mensaje para un destinatario',
    description: `
Aplica la plantilla con datos reales de un departamento/cuota específica.

Devuelve el **mensaje listo para copiar y enviar**, junto con el teléfono del propietario.

**Según el tipo de plantilla, enviar:**
- \`cuota_servicios\` / \`recordatorio_pago\`: enviar \`feeId\`
- \`limpieza\`: enviar \`cleaningRecordId\` + \`departamentoId\`
- \`bienvenida\` / \`aviso_general\`: enviar \`departamentoId\`

Para variables personalizadas adicionales usar \`variablesExtra\`:
\`{"mensaje_libre": "Habrá corte de agua el lunes."}\`
    `,
  })
  renderOne(@Body() dto: RenderTemplateDto) {
    return this.svc.renderForOne(dto);
  }

  @Post('render/all')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({
    summary: '📱 Renderizar mensaje para TODOS los deptos del edificio',
    description: `
Genera el mensaje personalizado para cada departamento activo en una sola llamada.

Devuelve un array con: depto, propietario, teléfono y mensaje listo para enviar.

Ideal para el flujo mensual donde el supervisor envía a todos los vecinos de corrido.
    `,
  })
  renderAll(@Body() dto: RenderAllDto) {
    return this.svc.renderForAll(dto);
  }
}
