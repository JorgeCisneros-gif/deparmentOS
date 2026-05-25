// src/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { Fee } from '../fees/fee.entity';
import { Service } from '../services/service.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { FeesModule } from '../fees/fees.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Fee, Service]),
    FeesModule,     // provee FeesService
    SharedModule,   // provee ImageUploadService
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
