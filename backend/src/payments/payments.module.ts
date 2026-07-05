// src/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { PaymentVoucher } from './payment-voucher.entity';
import { Fee } from '../fees/fee.entity';
import { Service } from '../services/service.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { FeesModule } from '../fees/fees.module';
import { SharedModule } from '../shared/shared.module';

/**
 * NOTA: StorageGatewayModule está marcado como @Global() en app.module.ts,
 * así que StorageGatewayService se inyecta automáticamente sin imports.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentVoucher, Fee, Service]),
    FeesModule,
    SharedModule,
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
