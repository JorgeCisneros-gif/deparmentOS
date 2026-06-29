// src/reports/reports.controller.ts
import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards, Request, Response, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SchedulerTokenGuard } from '../auth/guards/scheduler-token.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { MedicionesAnalyticsService } from './analytics/mediciones-analytics.service';
import { PagosAnalyticsService } from './analytics/pagos-analytics.service';
import { PdfGenerator } from './generators/pdf.generator';
import { CsvGenerator } from './generators/csv.generator';
import { ReportJobService } from './async/report-job.service';

// Umbral de filas para decidir sync vs async (híbrido)
const ASYNC_THRESHOLD_ROWS = 200;

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly medAnalytics: MedicionesAnalyticsService,
    private readonly pagAnalytics: PagosAnalyticsService,
    private readonly pdfGen:       PdfGenerator,
    private readonly csvGen:       CsvGenerator,
    private readonly jobs:         ReportJobService,
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

  /**
   * Export sync (descarga directa). Decide si es sync o async según filas.
   * Si el dataset es grande → 202 Accepted con jobId.
   */
  @Get('mediciones/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Export PDF o CSV de mediciones (auto sync/async)' })
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

    // Híbrido: si supera el umbral, encolar
    if (historial.length > ASYNC_THRESHOLD_ROWS) {
      const job = await this.jobs.enqueue({
        tipo: 'mediciones_ejecutivo',
        formato: format as 'pdf' | 'csv',
        params: {
          idDepartamento: deptId,
          tipoServicio:   servicio,
          maxMeses:       parseInt(maxMeses),
          edificio,
          departamento:   depto,
          rangoPeriodo:   `Últimos ${maxMeses} meses`,
        },
        createdBy: req.user.id,
        idGrupo:   req.user.idGrupo,
      });
      reply.status(202).send({
        async: true,
        jobId: job.id,
        message: `Reporte grande (${historial.length} filas). Encolado para procesamiento.`,
      });
      return;
    }

    // Sync: generar y devolver
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

  /**
   * Encola reporte ejecutivo (siempre async, aunque sea pequeño).
   * Útil para reportes con análisis profundo que toman tiempo.
   */
  @Post('mediciones/queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Encolar reporte ejecutivo de mediciones (async)' })
  async medicionesQueue(@Body() body: any, @Request() req: any) {
    const { deptId, servicio, maxMeses, format, edificio, depto, rangoPeriodo } = body;
    if (!deptId) throw new BadRequestException('deptId es requerido');

    const job = await this.jobs.enqueue({
      tipo: 'mediciones_ejecutivo',
      formato: (format || 'pdf') as 'pdf' | 'csv',
      params: {
        idDepartamento: deptId,
        tipoServicio:   servicio || 'agua',
        maxMeses:       maxMeses || 24,
        edificio:       edificio || '',
        departamento:   depto || '',
        rangoPeriodo:   rangoPeriodo || `Últimos ${maxMeses || 24} meses`,
      },
      createdBy: req.user.id,
      idGrupo:   req.user.idGrupo,
    });
    return { jobId: job.id, estado: job.estado };
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
  @ApiOperation({ summary: 'Export PDF o CSV de pagos (auto sync/async)' })
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

    if (historial.length > ASYNC_THRESHOLD_ROWS) {
      const job = await this.jobs.enqueue({
        tipo: 'pagos_conciliacion',
        formato: format as 'pdf' | 'csv',
        params: {
          idEdificio: edificioId,
          mes:        parseInt(mes),
          anio:       parseInt(anio),
          edificio,
          filtros,
        },
        createdBy: req.user.id,
        idGrupo:   req.user.idGrupo,
        idEdificio: edificioId,
      });
      reply.status(202).send({
        async: true,
        jobId: job.id,
        message: `Reporte grande (${historial.length} filas). Encolado para procesamiento.`,
      });
      return;
    }

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

  @Post('pagos/queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GESTION)
  @ApiOperation({ summary: 'Encolar conciliación bancaria (async)' })
  async pagosQueue(@Body() body: any, @Request() req: any) {
    const { edificioId, mes, anio, format, edificio, filtros } = body;
    if (!edificioId || !mes || !anio) {
      throw new BadRequestException('edificioId, mes y anio son requeridos');
    }
    const job = await this.jobs.enqueue({
      tipo: 'pagos_conciliacion',
      formato: (format || 'pdf') as 'pdf' | 'csv',
      params: {
        idEdificio: edificioId,
        mes,
        anio,
        edificio: edificio || '',
        filtros:  filtros || {},
      },
      createdBy: req.user.id,
      idGrupo:   req.user.idGrupo,
      idEdificio: edificioId,
    });
    return { jobId: job.id, estado: job.estado };
  }

  // ════════════════════════════════════════════════════════════
  //  JOBS (polling y descarga)
  // ════════════════════════════════════════════════════════════

  @Get('jobs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Estado de un job de reporte (para polling)' })
  async getJob(@Param('id') id: string, @Request() req: any) {
    const job = await this.jobs.get(id, req.user.id);
    return {
      id:             job.id,
      tipo:           job.tipo,
      estado:         job.estado,
      formato:        job.formato,
      rowsProcessed:  job.rowsProcessed,
      resultSizeKb:   job.resultSizeKb,
      error:          job.error,
      createdAt:      job.createdAt,
      completedAt:    job.completedAt,
    };
  }

  @Get('jobs/:id/download')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Descarga el archivo generado de un job' })
  async downloadJob(
    @Param('id') id: string,
    @Request() req: any,
    @Response() reply: any,
  ): Promise<any> {
    const file = await this.jobs.getFile(id, req.user.id);
    reply
      .header('content-type', file.contentType)
      .header('content-disposition', `attachment; filename="${file.filename}"`)
      .send(file.buffer);
  }

  // ════════════════════════════════════════════════════════════
  //  ENDPOINTS DEL SCHEDULER
  // ════════════════════════════════════════════════════════════

  @Post('jobs/process-next')
  @UseGuards(SchedulerTokenGuard)
  @ApiOperation({ summary: 'Procesa el siguiente job pending [Solo scheduler]' })
  async processNext() {
    const result = await this.jobs.processNext();
    return result || { jobId: null, estado: 'no_jobs_pending' };
  }

  @Post('jobs/cleanup')
  @UseGuards(SchedulerTokenGuard)
  @ApiOperation({ summary: 'Limpia jobs antiguos y archivos [Solo scheduler]' })
  async cleanup() {
    return this.jobs.cleanup();
  }
}
