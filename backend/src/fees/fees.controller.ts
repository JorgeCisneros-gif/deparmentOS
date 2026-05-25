import {
  Controller, Get, Post, Patch, Body, Param,
  Query, UseGuards, Request, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { CalculateFeesDto, UpdateFeeStatusDto } from './fees.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Fees')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fees')
export class FeesController {
  constructor(private readonly svc: FeesService) {}

  @Post('calculate')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Calcular cuotas del período para todos los deptos del edificio',
    description: `
Calcula automáticamente la cuota mensual de cada departamento:
- **Agua**: m3 consumido × precio/m3 del recibo (individual por depto)
- **Luz / Internet / Limpieza**: monto total ÷ cantidad de deptos activos
Si ya existen cuotas para el período, las actualiza.
    `,
  })
  calculate(@Body() dto: CalculateFeesDto) {
    return this.svc.calculatePeriod(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cuotas' })
  @ApiQuery({ name: 'deptId', required: false })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['pendiente', 'pagado', 'vencido', 'parcial'] })
  findAll(
    @Request() req,
    @Query('deptId') deptId?: string,
    @Query('year') year?: number,
    @Query('month') month?: number,
    @Query('status') status?: string,
  ) {
    // Propietario solo ve sus propias cuotas
    if (req.user.role === UserRole.PROPIETARIO) {
      deptId = req.user.idDepartamento;
    }
    return this.svc.findAll(deptId, year, month, status);
  }

  @Get('pending')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Resumen de cuotas pendientes del mes por edificio' })
  @ApiQuery({ name: 'buildingId', required: true })
  @ApiQuery({ name: 'month', required: true, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  pending(
    @Query('buildingId') buildingId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.svc.getPendingSummary(buildingId, month, year);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver cuota con desglose completo' })
  async findOne(@Param('id') id: string, @Request() req) {
    const fee = await this.svc.findOne(id);
    // Propietario solo puede ver su cuota
    if (
      req.user.role === UserRole.PROPIETARIO &&
      fee.idDepartamento !== req.user.idDepartamento
    ) {
      throw new BadRequestException('No tiene acceso a esta cuota');
    }
    return fee;
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar estado de pago de una cuota' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateFeeStatusDto) {
    return this.svc.updateStatus(id, dto.status);
  }

  @Get('period-vencimiento')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener fecha de vencimiento actual de las cuotas del período' })
  @ApiQuery({ name: 'buildingId', required: true })
  @ApiQuery({ name: 'month',      required: true, type: Number })
  @ApiQuery({ name: 'year',       required: true, type: Number })
  getPeriodVencimiento(
    @Query('buildingId') buildingId: string,
    @Query('month')      month: number,
    @Query('year')       year: number,
  ) {
    return this.svc.getPeriodVencimiento(buildingId, +month, +year);
  }

  @Patch('period-vencimiento')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar fecha de vencimiento para todas las cuotas del período' })
  updatePeriodVencimiento(
    @Body() body: { buildingId: string; month: number; year: number; fechaVencimiento: string },
  ) {
    return this.svc.updatePeriodVencimiento(
      body.buildingId, +body.month, +body.year, body.fechaVencimiento,
    );
  }
}