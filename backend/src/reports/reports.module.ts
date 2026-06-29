// src/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { MedicionesAnalyticsService } from './analytics/mediciones-analytics.service';
import { PagosAnalyticsService } from './analytics/pagos-analytics.service';
import { PdfGenerator } from './generators/pdf.generator';
import { CsvGenerator } from './generators/csv.generator';
import { ReportJob } from './async/report-job.entity';
import { ReportJobService } from './async/report-job.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReportJob])],
  controllers: [ReportsController],
  providers: [
    MedicionesAnalyticsService,
    PagosAnalyticsService,
    PdfGenerator,
    CsvGenerator,
    ReportJobService,
  ],
  exports: [
    MedicionesAnalyticsService,
    PagosAnalyticsService,
    ReportJobService,
  ],
})
export class ReportsModule {}
