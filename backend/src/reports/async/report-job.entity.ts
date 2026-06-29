// src/reports/async/report-job.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

export type ReportJobEstado = 'pending' | 'processing' | 'done' | 'failed';
export type ReportJobTipo   = 'mediciones_ejecutivo' | 'pagos_conciliacion';
export type ReportFormato   = 'pdf' | 'csv' | 'xlsx';

@Entity('report_jobs')
export class ReportJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  tipo: ReportJobTipo;

  @Column({ length: 20, default: 'pending' })
  estado: ReportJobEstado;

  @Column({ length: 10, default: 'pdf' })
  formato: ReportFormato;

  @Column({ type: 'jsonb', default: {} })
  params: Record<string, any>;

  @Column({ name: 'result_path', type: 'text', nullable: true })
  resultPath: string | null;

  @Column({ name: 'result_size_kb', type: 'int', nullable: true })
  resultSizeKb: number | null;

  @Column({ name: 'rows_processed', type: 'int', nullable: true })
  rowsProcessed: number | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'id_grupo' })
  idGrupo: string;

  @Column({ name: 'id_edificio', nullable: true })
  idEdificio: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
