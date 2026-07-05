// src/reports/reports.controller.ts
import {
  Controller, Get, Query,
  UseGuards, Request, Response, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MedicionesAnalyticsService } from './analytics/mediciones-analytics.service';
import { PagosAnalyticsService } from './analytics/pagos-analytics.service';
import { PdfGenerator } from './generators/pdf.generator';
import { CsvGenerator } from './generators/csv.generator';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly medAnalytics: MedicionesAnalyticsService,
    private readonly pagAnalytics: PagosAnalyticsService,
    private readonly pdfGen:       PdfGenerator,
    private readonly csvGen:       CsvGenerator,
  ) {}

  // ════════════════════════════════════════════════════════════
  //  MEDICIONES
  // ════════════════════════════════════════════════════════════

  @Get('mediciones/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'KPIs + historial de mediciones para un depto' })
  async medicionesAnalytics(
    @Query('deptId')   deptId:   string,
    @Query('servicio') servicio: string = 'agua',
    @Query('maxMeses') maxMeses: string = '12',
  ) {
    if (!deptId) throw new BadRequestException('deptId es requerido');
    return this.medAnalytics.getAnalyticsAndHistory(
      deptId,
      servicio,
      parseInt(maxMeses),
    );
  }

  @Get('mediciones/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Export PDF o CSV del historial de mediciones' })
  async medicionesExport(
    @Request()         req: any,
    @Response()        reply: any,
    @Query('deptId')   deptId:   string,
    @Query('format')   format:   string,
    @Query('servicio') servicio: string = 'agua',
    @Query('maxMeses') maxMeses: string = '12',
    @Query('edificio') edificio: string = '',
    @Query('depto')    depto:    string = '',
  ): Promise<any> {
    if (!deptId) throw new BadRequestException('deptId es requerido');
    if (!['pdf', 'csv'].includes(format)) {
      throw new BadRequestException('format debe ser pdf o csv');
    }

    const { analytics, historial } = await this.medAnalytics.getAnalyticsAndHistory(
      deptId, servicio, parseInt(maxMeses),
    );

    const buffer = format === 'pdf'
      ? await this.pdfGen.mediciones({
          edificio: edificio || 'Edificio',
          departamento: depto || '—',
          servicio,
          rangoPeriodo: `Últimos ${maxMeses} meses`,
          analytics,
          historial,
        })
      : this.csvGen.mediciones(historial);

    const filename = `mediciones_${depto || deptId}_${Date.now()}.${format}`;
    const contentType = format === 'pdf'
      ? 'application/pdf'
      : 'text/csv; charset=utf-8';

    reply
      .header('content-type', contentType)
      .header('content-disposition', `attachment; filename="${filename}"`)
      .send(buffer);
  }

  // ════════════════════════════════════════════════════════════
  //  PAGOS
  // ════════════════════════════════════════════════════════════

  @Get('pagos/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'KPIs + historial de pagos para edificio + mes' })
  async pagosAnalytics(
    @Query('edificioId') edificioId: string,
    @Query('mes')        mes:        string,
    @Query('anio')       anio:       string,
    @Query('metodo')     metodo:     string = '',
    @Query('banco')      banco:      string = '',
    @Query('estado')     estado:     string = '',
  ) {
    if (!edificioId || !mes || !anio) {
      throw new BadRequestException('edificioId, mes y anio son requeridos');
    }
    return this.pagAnalytics.getAnalyticsAndHistory(
      edificioId, parseInt(mes), parseInt(anio),
      {
        metodo: metodo || undefined,
        banco:  banco  || undefined,
        estado: estado || undefined,
      },
    );
  }

  @Get('pagos/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Export PDF o CSV del historial de pagos' })
  async pagosExport(
    @Request()           req:        any,
    @Response()          reply:      any,
    @Query('edificioId') edificioId: string,
    @Query('mes')        mes:        string,
    @Query('anio')       anio:       string,
    @Query('format')     format:     string,
    @Query('edificio')   edificio:   string = '',
    @Query('metodo')     metodo:     string = '',
    @Query('banco')      banco:      string = '',
    @Query('estado')     estado:     string = '',
  ): Promise<any> {
    if (!edificioId || !mes || !anio) {
      throw new BadRequestException('edificioId, mes y anio son requeridos');
    }
    if (!['pdf', 'csv'].includes(format)) {
      throw new BadRequestException('format debe ser pdf o csv');
    }

    const filtros = {
      metodo: metodo || undefined,
      banco:  banco  || undefined,
      estado: estado || undefined,
    };

    const { analytics, historial } = await this.pagAnalytics.getAnalyticsAndHistory(
      edificioId, parseInt(mes), parseInt(anio), filtros,
    );

    const buffer = format === 'pdf'
      ? await this.pdfGen.pagos({
          edificio: edificio || 'Edificio',
          periodo: { mes: parseInt(mes), anio: parseInt(anio) },
          analytics,
          historial,
        })
      : this.csvGen.pagos(historial);

    const filename = `pagos_${anio}-${String(mes).padStart(2, '0')}_${Date.now()}.${format}`;
    const contentType = format === 'pdf'
      ? 'application/pdf'
      : 'text/csv; charset=utf-8';

    reply
      .header('content-type', contentType)
      .header('content-disposition', `attachment; filename="${filename}"`)
      .send(buffer);
  }
}
