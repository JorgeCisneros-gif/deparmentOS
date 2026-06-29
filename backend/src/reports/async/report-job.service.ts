// src/reports/async/report-job.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { ReportJob, ReportJobTipo, ReportFormato } from './report-job.entity';
import { MedicionesAnalyticsService } from '../analytics/mediciones-analytics.service';
import { PagosAnalyticsService } from '../analytics/pagos-analytics.service';
import { PdfGenerator } from '../generators/pdf.generator';
import { CsvGenerator } from '../generators/csv.generator';

/**
 * Gestión de jobs asíncronos de reportes.
 *
 * - enqueue(): crea un job en estado 'pending'
 * - processNext(): toma 1 job pending → processing → done/failed
 * - get(): consulta estado (polling del frontend)
 * - getFile(): devuelve el archivo generado para descarga
 *
 * El scheduler externo llama periódicamente a processNext().
 */
@Injectable()
export class ReportJobService {
  private readonly logger = new Logger(ReportJobService.name);
  private readonly outputDir: string;

  // Tiempo de vida de los archivos generados antes de ser borrados
  private readonly FILE_TTL_HOURS = 24;

  constructor(
    @InjectRepository(ReportJob) private readonly repo: Repository<ReportJob>,
    private readonly medAnalytics: MedicionesAnalyticsService,
    private readonly pagAnalytics: PagosAnalyticsService,
    private readonly pdfGen: PdfGenerator,
    private readonly csvGen: CsvGenerator,
  ) {
    this.outputDir = process.env.REPORT_OUTPUT_DIR || './uploads/reports';
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /** Encola un nuevo job de reporte. Devuelve el ID para que el frontend haga polling. */
  async enqueue(params: {
    tipo:       ReportJobTipo;
    formato:    ReportFormato;
    params:     Record<string, any>;
    createdBy:  string;
    idGrupo:    string;
    idEdificio?: string;
  }): Promise<ReportJob> {
    const job = this.repo.create({
      tipo:       params.tipo,
      formato:    params.formato,
      estado:     'pending',
      params:     params.params,
      createdBy:  params.createdBy,
      idGrupo:    params.idGrupo,
      idEdificio: params.idEdificio || null,
    });

    const saved = await this.repo.save(job);
    this.logger.log(`Job ${saved.id} encolado (tipo=${params.tipo})`);
    return saved;
  }

  /** Estado de un job para polling del frontend. */
  async get(jobId: string, requesterId: string): Promise<ReportJob> {
    const job = await this.repo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Reporte no encontrado');
    if (job.createdBy !== requesterId) {
      // Por seguridad, solo el creador puede consultar/descargar
      throw new NotFoundException('Reporte no encontrado');
    }
    return job;
  }

  /** Devuelve el archivo + content-type para descarga directa. */
  async getFile(jobId: string, requesterId: string): Promise<{
    buffer: Buffer;
    filename: string;
    contentType: string;
  }> {
    const job = await this.get(jobId, requesterId);
    if (job.estado !== 'done' || !job.resultPath) {
      throw new NotFoundException('Reporte aún no está listo');
    }
    if (!fs.existsSync(job.resultPath)) {
      throw new NotFoundException('Archivo del reporte no disponible (expirado)');
    }

    const buffer = fs.readFileSync(job.resultPath);
    const filename = path.basename(job.resultPath);
    const contentType = job.formato === 'pdf'
      ? 'application/pdf'
      : job.formato === 'csv'
        ? 'text/csv; charset=utf-8'
        : 'application/octet-stream';

    return { buffer, filename, contentType };
  }

  /**
   * Procesa UN job pending. Si no hay nada que hacer, devuelve null.
   * Lo llama el scheduler externo cada N segundos.
   */
  async processNext(): Promise<{ jobId: string; estado: string } | null> {
    // Tomar el job más viejo en estado pending
    const job = await this.repo.findOne({
      where:    { estado: 'pending' },
      order:    { createdAt: 'ASC' },
    });
    if (!job) return null;

    // Marcar como processing (idempotente, simple)
    job.estado    = 'processing';
    job.startedAt = new Date();
    await this.repo.save(job);

    this.logger.log(`Procesando job ${job.id} (tipo=${job.tipo}, formato=${job.formato})`);

    try {
      await this.processJob(job);
      return { jobId: job.id, estado: 'done' };
    } catch (err) {
      this.logger.error(`Job ${job.id} falló: ${err.message}`, err.stack);
      job.estado      = 'failed';
      job.error       = (err.message || 'Error desconocido').slice(0, 1000);
      job.completedAt = new Date();
      await this.repo.save(job);
      return { jobId: job.id, estado: 'failed' };
    }
  }

  /** Lógica para generar el archivo. */
  private async processJob(job: ReportJob): Promise<void> {
    let buffer: Buffer;
    let ext: string;
    let rowsCount = 0;

    if (job.tipo === 'mediciones_ejecutivo') {
      const p = job.params as {
        idDepartamento: string; tipoServicio?: string; maxMeses?: number;
        edificio: string; departamento: string; rangoPeriodo: string;
      };
      const { analytics, historial } = await this.medAnalytics.getAnalyticsAndHistory(
        p.idDepartamento, p.tipoServicio || 'agua', p.maxMeses || 24,
      );
      rowsCount = historial.length;

      if (job.formato === 'pdf') {
        buffer = await this.pdfGen.mediciones({
          edificio: p.edificio,
          departamento: p.departamento,
          servicio: p.tipoServicio || 'agua',
          rangoPeriodo: p.rangoPeriodo,
          analytics,
          historial,
        });
        ext = 'pdf';
      } else {
        buffer = this.csvGen.mediciones(historial);
        ext = 'csv';
      }
    } else if (job.tipo === 'pagos_conciliacion') {
      const p = job.params as {
        idEdificio: string; mes: number; anio: number;
        edificio: string;
        filtros?: any;
      };
      const { analytics, historial } = await this.pagAnalytics.getAnalyticsAndHistory(
        p.idEdificio, p.mes, p.anio, p.filtros || {},
      );
      rowsCount = historial.length;

      if (job.formato === 'pdf') {
        buffer = await this.pdfGen.pagos({
          edificio: p.edificio,
          periodo: { mes: p.mes, anio: p.anio },
          analytics,
          historial,
        });
        ext = 'pdf';
      } else {
        buffer = this.csvGen.pagos(historial);
        ext = 'csv';
      }
    } else {
      throw new Error(`Tipo de reporte desconocido: ${job.tipo}`);
    }

    // Guardar archivo
    const filename = `${job.tipo}_${job.id}.${ext}`;
    const fullPath = path.join(this.outputDir, filename);
    fs.writeFileSync(fullPath, buffer);

    job.estado         = 'done';
    job.resultPath     = fullPath;
    job.resultSizeKb   = Math.round(buffer.length / 1024);
    job.rowsProcessed  = rowsCount;
    job.completedAt    = new Date();
    await this.repo.save(job);

    this.logger.log(
      `Job ${job.id} completado: ${ext.toUpperCase()}, ${job.resultSizeKb} KB, ${rowsCount} filas`,
    );
  }

  /** Limpia jobs antiguos y sus archivos. Lo llama el scheduler también. */
  async cleanup(): Promise<{ jobsDeleted: number; filesDeleted: number }> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - this.FILE_TTL_HOURS);

    const oldJobs = await this.repo.find({
      where: { completedAt: LessThan(cutoff) },
    });

    let filesDeleted = 0;
    for (const job of oldJobs) {
      if (job.resultPath && fs.existsSync(job.resultPath)) {
        try {
          fs.unlinkSync(job.resultPath);
          filesDeleted++;
        } catch (err) {
          this.logger.warn(`No se pudo borrar archivo ${job.resultPath}: ${err.message}`);
        }
      }
    }

    let jobsDeleted = 0;
    if (oldJobs.length > 0) {
      await this.repo.remove(oldJobs);
      jobsDeleted = oldJobs.length;
    }

    return { jobsDeleted, filesDeleted };
  }
}
