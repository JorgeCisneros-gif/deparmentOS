// src/fees/fees.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fee } from './fee.entity';
import { Service } from '../services/service.entity';
import { Department } from '../departments/department.entity';
import { Alicuota } from '../alicuotas/alicuota.entity';
import { AlicuotasModule } from '../alicuotas/alicuotas.module';
import { FeesService } from './fees.service';
import { FeesController } from './fees.controller';
import { DepartmentsModule } from '../departments/departments.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { ReadingsModule } from '../readings/readings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Fee, Service, Department, Alicuota]),
    DepartmentsModule,
    AlicuotasModule,
    ReceiptsModule,
    ReadingsModule,
  ],
  providers: [FeesService],
  controllers: [FeesController],
  exports: [FeesService],
})
export class FeesModule {}
