import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reading } from './reading.entity';
import { MeterImage } from './meter-image.entity';
import { ReadingsService } from './readings.service';
import { ReadingsController } from './readings.controller';
import { OcrService } from './ocr.service';
import { OcrSessionCache } from './ocr-session.cache';
import { ReceiptsModule } from '../receipts/receipts.module';
import { DepartmentsModule } from '../departments/departments.module';

/**
 * NOTA: StorageGatewayModule está marcado como @Global() en app.module.ts,
 * por lo que NO necesitamos importarlo aquí explícitamente — el
 * StorageGatewayService se inyecta automáticamente en ReadingsService.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Reading, MeterImage]),
    ReceiptsModule,
    DepartmentsModule,
  ],
  providers: [ReadingsService, OcrService, OcrSessionCache],
  controllers: [ReadingsController],
  exports: [ReadingsService],
})
export class ReadingsModule {}
