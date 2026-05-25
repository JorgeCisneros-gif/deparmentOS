import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reading } from './reading.entity';
import { MeterImage } from './meter-image.entity';
import { ReadingsService } from './readings.service';
import { ReadingsController } from './readings.controller';
import { OcrService } from './ocr.service';
import { ReceiptsModule } from '../receipts/receipts.module';
import { DepartmentsModule } from '../departments/departments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reading, MeterImage]),
    ReceiptsModule,
    DepartmentsModule,
  ],
  providers: [ReadingsService, OcrService],
  controllers: [ReadingsController],
  exports: [ReadingsService],
})
export class ReadingsModule {}
